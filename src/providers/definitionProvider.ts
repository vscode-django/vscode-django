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
    WorkspaceConfiguration
} from 'vscode'
import { DJANGO_HTML_SELECTOR, PYTHON_SELECTOR } from '../constants'

let regex = (regexes: RegExp[]) => new RegExp(regexes.map(re => re.source).join(''))

const quote = /(?:\'|\")/
const path_re = /([\w/\-]+\.[\w]+)/
const rel_path_re = /((?:(?:\.\/|(?:\.\.\/)+))[\w/\-]+\.[\w]+)/
const component_re = /<c-([\w\-]+)\b[^>]*\/?>/

const PATH_RE = regex([quote, path_re, quote])
const RELATIVE_PATH_RE = regex([quote, rel_path_re, quote])
const COMPONENT_RE = regex([component_re])
const BEGIN_OF_FILE = new Position(0, 0)

let cache: any = {}

export class TemplatePathProvider implements DefinitionProvider {

    public selector = [DJANGO_HTML_SELECTOR, PYTHON_SELECTOR]

    private static getTemplate(document: TextDocument, position: Position, token: CancellationToken): Thenable<Uri | null> {

        let path: string
        let search: string
        let line = document.lineAt(position.line).text
        let match = line.match(PATH_RE)
        let relative_match = line.match(RELATIVE_PATH_RE)
        let component_match = line.match(COMPONENT_RE)
        let original_component_name: string | undefined

        if (relative_match) {
            path = relative_match[1]
            search = workspace.asRelativePath(resolve(dirname(document.uri.path), path))
        } else if (match) {
            path = match[1]
            search = `**/{templates,jinja2}/${path}`
        } else if (component_match) {
            original_component_name = component_match[1]
            path = original_component_name.replace(/-/g, '_')
            const config: WorkspaceConfiguration = workspace.getConfiguration('djangoCotton')
            const componentFolder = config.get<string>('componentFolder', 'templates/cotton')
            search = `**/${componentFolder}/${path}.html`
        } else {
            return Promise.resolve(null)
        }

        let pos = position.character
        let cursorOverPath = original_component_name
            ? pos > line.indexOf(original_component_name) && pos < line.indexOf(original_component_name) + original_component_name.length
            : pos > line.indexOf(path) && pos < line.indexOf(path) + path.length

        let uri: Thenable<Uri | null>

        if (search in cache) {
            uri = Promise.resolve(cache[search])
        } else {
            uri = workspace.findFiles(search, '', 1, token).then(results => {
                let result = results.length ? results[0] : null
                if (result) cache[search] = result
                return result
            })
        }

        if (cursorOverPath) {
            return uri
        } else {
            return Promise.resolve(null)
        }
    }

    public provideDefinition(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Definition> {
        return TemplatePathProvider.getTemplate(document, position, token).then(template => {
            if (! template) return null
            return new Location(template, BEGIN_OF_FILE)
        })
    }
}
