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

// {% url 'app:detail' pk=1 %} or {% static "css/app.css" %}
const TAG_RE = /{%-?\s*(url|static)\s+(['"])([^'"]+)\2[^%]*%}/g
const EXCLUDE = '**/{node_modules,.venv,venv,.git}/**'

class TemplateLink extends DocumentLink {
    constructor(range: Range, public kind: 'url' | 'static', public value: string) {
        super(range)
        this.tooltip = kind === 'url' ? `Go to the URL pattern "${value}"` : `Open the static file ${value}`
    }
}

// Ctrl+click on {% url %} opens the URL pattern, on {% static %} the static file.
// In HTML templates, VS Code's HTML support also makes a link from the attribute value, like
// href="{% url 'home' %}", to a file that doesn't exist. Built-in providers come last, and VS Code
// keeps only the link of the first provider when two links overlap, so these links replace them.
export class TemplateLinkProvider implements DocumentLinkProvider<TemplateLink> {

    public selector = TEMPLATE_SELECTOR

    public provideDocumentLinks(document: TextDocument): TemplateLink[] {
        const text = document.getText()
        const links: TemplateLink[] = []
        for (const match of text.matchAll(TAG_RE)) {
            const range = new Range(document.positionAt(match.index!), document.positionAt(match.index! + match[0].length))
            links.push(new TemplateLink(range, match[1] as 'url' | 'static', match[3]))
        }
        return links
    }

    public async resolveDocumentLink(link: TemplateLink, token: CancellationToken): Promise<TemplateLink> {
        link.target = link.kind === 'url' ? await findUrlPattern(link.value, token) : await findStaticFile(link.value, token)
        return link
    }
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// The path() or re_path() named `name`, in the urls.py whose app_name is the namespace if any
async function findUrlPattern(reference: string, token: CancellationToken): Promise<Uri | undefined> {
    const parts = reference.split(':')
    const name = parts.pop()!
    const namespace = parts.pop()
    const nameRe = new RegExp(`\\bname\\s*=\\s*(['"])${escape(name)}\\1`)
    const appNameRe = namespace && new RegExp(`^app_name\\s*=\\s*(['"])${escape(namespace)}\\1`, 'm')

    let fallback: Uri | undefined
    for (const uri of await workspace.findFiles('**/{urls.py,urls/**/*.py}', EXCLUDE, undefined, token)) {
        if (token.isCancellationRequested) return undefined
        const text = new TextDecoder('utf-8').decode(await workspace.fs.readFile(uri))
        const match = nameRe.exec(text)
        if (!match) continue
        const lines = text.slice(0, match.index).split('\n')
        // Opens the file on the line of the name, like file.py#L12,5
        const target = uri.with({ fragment: `L${lines.length},${lines[lines.length - 1].length + 1}` })
        if (!appNameRe || appNameRe.test(text)) return target
        fallback ??= target
    }
    return fallback
}

async function findStaticFile(path: string, token: CancellationToken): Promise<Uri | undefined> {
    const [result] = await workspace.findFiles(`**/static/${path.replace(/^\/+/, '')}`, EXCLUDE, 1, token)
    return result
}
