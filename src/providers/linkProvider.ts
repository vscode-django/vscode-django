'use strict'

import {
    CancellationToken,
    DocumentLink,
    DocumentLinkProvider,
    Range,
    TextDocument,
    Uri,
    workspace,
} from 'vscode'
import { TEMPLATE_SELECTOR } from '../constants'
import { DjangoDocs } from './djangoDocs'
import { escapeRegExp, EXCLUDE, fragmentOf, loadedLibraries, positionAt, read, TagIndex } from './tagIndex'
import { blockSupers, findParentBlock } from './templateHierarchy'

// {% url 'app:detail' pk=1 %} or {% static "css/app.css" %}
const URL_STATIC_RE = /{%-?\s*(url|static)\s+(['"])([^'"]+)\2[^%]*%}/g
// The name of any tag, like custom_tag in {% custom_tag "app.js" %}
const TAG_NAME_RE = /{%-?\s*(\w+)\b/g
// {{ ... }} and {% ... %}, where the filters are
const TEMPLATE_TAG_RE = /{{[\s\S]*?}}|{%[\s\S]*?%}/g
const FILTER_RE = /\|\s*(\w+)/g
const STRING_RE = /"[^"]*"|'[^']*'/g

// These tags have a link or a definition of their own: {% extends %} and {% include %} open the template,
// {% load %} goes to each library
const NO_DOCS_LINK = new Set(['url', 'static', 'extends', 'include', 'load'])

class TemplateLink extends DocumentLink {
    constructor(range: Range, public kind: 'url' | 'static', public value: string) {
        super(range)
        this.tooltip = kind === 'url' ? `Go to the URL pattern "${value}"` : `Open the static file ${value}`
    }
}

// Ctrl+click on {% url %} opens the URL pattern, on {% static %} the static file.
// On {{ block.super }}, it opens the block of the parent template.
// On the name of a custom tag, like {% custom_tag "app.js" %}, it opens the function that registers it.
// On the name of a tag or a filter of Django, it opens its documentation for the version of Django of the project.
//
// In HTML templates, VS Code's HTML support also makes a link from an attribute value like
// href="{% url 'home' %}" to a file that doesn't exist. Built-in providers come last, and VS Code
// keeps only the link of the first provider when two links overlap, so these links replace them.
export class TemplateLinkProvider implements DocumentLinkProvider {

    public selector = TEMPLATE_SELECTOR

    constructor(private index: TagIndex, private docs: DjangoDocs) { }

    public async provideDocumentLinks(document: TextDocument): Promise<DocumentLink[]> {
        const text = document.getText()
        const range = (index: number, length: number) =>
            new Range(document.positionAt(index), document.positionAt(index + length))

        const links: DocumentLink[] = []
        for (const match of text.matchAll(URL_STATIC_RE)) {
            links.push(new TemplateLink(range(match.index!, match[0].length), match[1] as 'url' | 'static', match[3]))
        }

        // Only when a parent template defines the block: a link without a target is an error in VS Code
        for (const sup of blockSupers(text)) {
            const parent = await findParentBlock(document.uri, text, sup.block)
            if (!parent) continue
            const link = new DocumentLink(range(sup.start, sup.length), parent.uri.with({ fragment: fragmentOf(parent.range.start) }))
            link.tooltip = `Go to {% block ${sup.block} %} of the parent template`
            links.push(link)
        }

        const { tags, djangoVersion } = await this.index.get()
        const loaded = loadedLibraries(text)
        for (const match of text.matchAll(TAG_NAME_RE)) {
            const name = match[1]
            if (NO_DOCS_LINK.has(name)) continue
            const nameRange = range(match.index! + match[0].length - name.length, name.length)

            // The tags of the project come first, even when they have the name of a tag of Django.
            // The ones of an installed package, like django_vite, only when the template loads the library
            const definitions = tags.get(name)?.filter(def => !def.django)
            const definition = definitions?.find(def => loaded.has(def.library)) ?? definitions?.find(def => !def.thirdParty)
            if (definition) {
                const link = new DocumentLink(nameRange, definition.uri.with({ fragment: fragmentOf(definition.position) }))
                link.tooltip = `Go to the definition of ${name}`
                links.push(link)
                continue
            }
            const docs = await this.docs.url('tag', name, djangoVersion)
            if (docs) links.push(docsLink(nameRange, docs, name))
        }

        for (const tag of text.matchAll(TEMPLATE_TAG_RE)) {
            // The strings are hidden, so that a | in {{ "a|b" }} is not a filter
            const hidden = tag[0].replace(STRING_RE, string => ' '.repeat(string.length))
            for (const match of hidden.matchAll(FILTER_RE)) {
                const name = match[1]
                const docs = await this.docs.url('filter', name, djangoVersion)
                if (docs) links.push(docsLink(range(tag.index! + match.index! + match[0].length - name.length, name.length), docs, name))
            }
        }
        return links
    }

    public async resolveDocumentLink(link: DocumentLink, token: CancellationToken): Promise<DocumentLink> {
        if (link instanceof TemplateLink) {
            link.target = link.kind === 'url' ? await findUrlPattern(link.value, token) : await findStaticFile(link.value, token)
        }
        return link
    }
}

function docsLink(range: Range, target: Uri, name: string): DocumentLink {
    const link = new DocumentLink(range, target)
    link.tooltip = `Open the Django documentation of ${name}`
    return link
}

// The path() or re_path() named `name`, in the urls.py whose app_name is the namespace if any
async function findUrlPattern(reference: string, token: CancellationToken): Promise<Uri | undefined> {
    const parts = reference.split(':')
    const name = parts.pop()!
    const namespace = parts.pop()
    const nameRe = new RegExp(`\\bname\\s*=\\s*(['"])${escapeRegExp(name)}\\1`)
    const appNameRe = namespace && new RegExp(`^app_name\\s*=\\s*(['"])${escapeRegExp(namespace)}\\1`, 'm')

    let fallback: Uri | undefined
    for (const uri of await workspace.findFiles('**/{urls.py,urls/**/*.py}', EXCLUDE, undefined, token)) {
        if (token.isCancellationRequested) return undefined
        const text = await read(uri)
        const match = nameRe.exec(text)
        if (!match) continue
        // Opens the file on the line of the name, like file.py#L12,5
        const target = uri.with({ fragment: fragmentOf(positionAt(text, match.index)) })
        if (!appNameRe || appNameRe.test(text)) return target
        fallback ??= target
    }
    return fallback
}

async function findStaticFile(path: string, token: CancellationToken): Promise<Uri | undefined> {
    const [result] = await workspace.findFiles(`**/static/${path.replace(/^\/+/, '')}`, EXCLUDE, 1, token)
    return result
}
