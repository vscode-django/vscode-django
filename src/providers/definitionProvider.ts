'use strict';

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
} from 'vscode';

const TEMPLATE_PATH_RE = /{% (?:[\w-]+) [\'|\"]([\w/.]*)[\'|\"]/; // {% tag_name "capture/this"
const TEMPLATE_GLOB = "**/templates/";
const BEGIN_OF_FILE = new Position(0, 0);

let cache: any = {};

export class TemplatePathProvider implements DefinitionProvider {

    public selector = { scheme: 'file', language: 'django-html' };

    private static getTemplate(document: TextDocument, position: Position, token: CancellationToken): Thenable<Uri | null> {

        let line = document.lineAt(position.line).text;
        let matches = line.match(TEMPLATE_PATH_RE);
        if (! matches) return Promise.resolve(null);

        let path = matches[1];
        
        let template_search = `${TEMPLATE_GLOB}${path}`;
        let exclude = '';
        let max_results = 1;

        if (template_search in cache) return Promise.resolve(cache[template_search])

        let uri = workspace.findFiles(template_search, exclude, max_results, token).then(results => {
            let result = results.length ? results[0] : null
            if (result) {
                cache[template_search] = result
            }
            return result
        })

        let pos = position.character;
        if (pos < line.indexOf(path) || pos > line.indexOf(path) + path.length) return Promise.resolve(null);

        return uri
    }

    public provideDefinition(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Definition> {
        return TemplatePathProvider.getTemplate(document, position, token).then(template => {
            if (! template) return null;
            return new Location(template, BEGIN_OF_FILE);
        })
    }
}
