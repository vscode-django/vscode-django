'use strict'

import { dirname, resolve } from 'path'
import {
    CancellationToken,
    Definition,
    DefinitionProvider,
    Location,
    Position,
    ProviderResult,
    TextDocument,
    Uri,
    workspace,
} from 'vscode'
import { DJANGO_HTML_SELECTOR, PYTHON_SELECTOR } from '../constants'

const regex = (regexes: RegExp[]) => new RegExp(regexes.map(re => re.source).join(''))

const quote = /(?:'|")/
const path_re = /([\w/-]+\.[\w]+)/
const rel_path_re = /((?:(?:\.\/|(?:\.\.\/)+))[\w/-]+\.[\w]+)/

// django-cotton component tag, like <c-card> or <c-forms.text-input />
const COMPONENT_RE = /<c-([\w.-]+)/g

const PATH_RE = regex([quote, path_re, quote])
const RELATIVE_PATH_RE = regex([quote, rel_path_re, quote])
const BEGIN_OF_FILE = new Position(0, 0)

const cache: { [search: string]: Uri } = {}

export class TemplatePathProvider implements DefinitionProvider {

    public selector = [DJANGO_HTML_SELECTOR, PYTHON_SELECTOR]

    private static getTemplate(document: TextDocument, position: Position, token: CancellationToken): Thenable<Uri | null> {

        let path: string
        let search: string
        const line = document.lineAt(position.line).text
        const match = line.match(PATH_RE)
        const relative_match = line.match(RELATIVE_PATH_RE)

        if (relative_match) {
            path = relative_match[1]
            search = workspace.asRelativePath(resolve(dirname(document.uri.path), path))
        } else if (match) {
            path = match[1]
            search = `**/{templates,jinja2}/${path}`
        } else {
            return TemplatePathProvider.getComponent(line, position, token)
        }

        const pos = position.character
        const cursorOverPath = pos > line.indexOf(path) && pos < line.indexOf(path) + path.length

        return cursorOverPath ? TemplatePathProvider.find(search, token) : Promise.resolve(null)
    }

    // <c-forms.text-input> lives in cotton/forms/text_input.html or cotton/forms/text_input/index.html
    private static getComponent(line: string, position: Position, token: CancellationToken): Thenable<Uri | null> {
        COMPONENT_RE.lastIndex = 0
        let match: RegExpExecArray | null
        while ((match = COMPONENT_RE.exec(line))) {
            const start = match.index + 3
            if (position.character < start || position.character > start + match[1].length) continue
            const dir = workspace.getConfiguration('django').get<string>('cotton.dir', 'cotton')
            const path = match[1].replace(/-/g, '_').replace(/\./g, '/')
            return TemplatePathProvider.find(`**/templates/${dir}/{${path}.html,${path}/index.html}`, token)
        }
        return Promise.resolve(null)
    }

    private static find(search: string, token: CancellationToken): Thenable<Uri | null> {

        if (search in cache) {
            return Promise.resolve(cache[search])
        }
        return workspace.findFiles(search, '', 1, token).then(results => {
            const result = results.length ? results[0] : null
            if (result) cache[search] = result
            return result
        })
    }

    public provideDefinition(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Definition> {
        return TemplatePathProvider.getTemplate(document, position, token).then(template => {
            if (! template) return null
            return new Location(template, BEGIN_OF_FILE)
        })
    }
}
