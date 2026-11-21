'use strict'

import {
    CancellationToken,
    Location,
    Position,
    Range,
    ReferenceContext,
    ReferenceProvider,
    TextDocument,
    workspace,
} from 'vscode'
import { PYTHON_SELECTOR, TEMPLATE_SELECTOR } from '../constants'
import { escapeRegExp, EXCLUDE, positionAt, registeredTags, TagIndex, textOf } from './tagIndex'

const TEMPLATES = '**/{templates,jinja2}/**/*.{html,htm,txt,xml,svg,tex}'
const BLOCK_RE = /{%-?\s*(?:end)?block\s+(\w+)/g
const TEMPLATE_PATH_RE = /{%-?\s*(?:extends|include)\s+(['"])([^'"]+)\1/g
const TAG_NAME_RE = /{%-?\s*(\w+)\b/g
// "app/page.html" in a view
const PYTHON_PATH_RE = /(['"])([\w/.-]+\.(?:html|htm|txt|xml|svg|tex))\1/g

// What Go to References is asked for: a tag (which can be registered with several names),
// a block, or a template
interface Symbol {
    kind: 'tag' | 'block' | 'template'
    names: string[]
}

// Go to References (Shift+F12) answers "where is it used?":
// - on a custom tag in a template, or on the function that registers it: every template that uses the tag,
// - on the name of a block: the templates that define or override this block,
// - on the path of a template in {% extends %}, {% include %} or a view: the templates and the Python code that use it.
export class TemplateReferenceProvider implements ReferenceProvider {

    public selector = [...TEMPLATE_SELECTOR, PYTHON_SELECTOR]

    constructor(private index: TagIndex) { }

    public async provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[] | null> {
        const symbol = symbolAt(document, position)
        if (!symbol) return null

        const files = await workspace.findFiles(TEMPLATES, EXCLUDE, undefined, token)
        // A template is also used by the views
        if (symbol.kind === 'template') files.push(...await workspace.findFiles('**/*.py', EXCLUDE, undefined, token))

        const locations: Location[] = []
        for (const uri of files) {
            if (token.isCancellationRequested) return null
            const text = await textOf(uri)
            for (const [start, length] of usages(text, symbol)) {
                locations.push(new Location(uri, new Range(positionAt(text, start), positionAt(text, start + length))))
            }
        }

        if (context.includeDeclaration && symbol.kind === 'tag') {
            const { tags } = await this.index.get()
            for (const name of symbol.names) {
                for (const def of tags.get(name)?.filter(def => !def.django) ?? []) {
                    locations.push(new Location(def.uri, new Range(def.position, def.position)))
                }
            }
        }
        return locations
    }
}

function symbolAt(document: TextDocument, position: Position): Symbol | undefined {
    if (document.languageId === 'python') {
        const text = document.getText()
        const offset = document.offsetAt(position)
        // The decorators and the name of a function that registers tags
        for (const registered of registeredTags(text)) {
            if (offset >= registered.start && offset <= registered.end) return { kind: 'tag', names: registered.tags }
        }
        for (const match of text.matchAll(PYTHON_PATH_RE)) {
            if (offset > match.index! && offset < match.index! + match[0].length - 1) return { kind: 'template', names: [match[2]] }
        }
        return undefined
    }

    const line = document.lineAt(position.line).text
    const over = (start: number, length: number) => position.character >= start && position.character <= start + length
    for (const match of line.matchAll(BLOCK_RE)) {
        if (over(match.index! + match[0].length - match[1].length, match[1].length)) return { kind: 'block', names: [match[1]] }
    }
    for (const match of line.matchAll(TEMPLATE_PATH_RE)) {
        if (over(match.index! + match[0].length - 1 - match[2].length, match[2].length)) return { kind: 'template', names: [match[2]] }
    }
    for (const match of line.matchAll(TAG_NAME_RE)) {
        if (over(match.index! + match[0].length - match[1].length, match[1].length)) return { kind: 'tag', names: [match[1]] }
    }
    return undefined
}

// The start and the length of the usages of the symbol in a file
function* usages(text: string, symbol: Symbol): Iterable<[number, number]> {
    const names = symbol.names.map(escapeRegExp).join('|')
    if (symbol.kind === 'template') {
        // The path in quotes, in {% extends "app/base.html" %} or render(request, "app/base.html")
        for (const match of text.matchAll(new RegExp(`(['"])(?:${names})\\1`, 'g'))) yield [match.index! + 1, match[0].length - 2]
        return
    }
    // {% custom_tag %} and its end tag, or {% block name %} and {% endblock name %}
    const re = symbol.kind === 'tag'
        ? new RegExp(`{%-?\\s*((?:end)?(?:${names}))\\b`, 'g')
        : new RegExp(`{%-?\\s*(?:end)?block\\s+(${names})(?!\\w)`, 'g')
    for (const match of text.matchAll(re)) yield [match.index! + match[0].length - match[1].length, match[1].length]
}

