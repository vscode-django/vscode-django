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

const TEMPLATE_PATH_RE = /{% (?:include|extends) [\'|\"]([\w/.]*)[\'|\"]/;
const TEMPLATE_GLOB = "**/templates/**/";
const BEGIN_OF_FILE = new Position(0, 0);


export class TemplatePathProvider implements DefinitionProvider {

    public selector = { scheme: 'file', language: 'django-html' };

    private static getTemplate(document: TextDocument, position: Position, token: CancellationToken): Thenable<Uri | null> {
        const EXCLUDE = '';
        const MAX_RESULTS = 1;
    
        const matches = document.lineAt(position.line).text.match(TEMPLATE_PATH_RE);
        if (! matches) return Promise.resolve(null);
        const template = TEMPLATE_GLOB + matches[1];
        
        return workspace.findFiles(template, EXCLUDE, MAX_RESULTS, token).then(results => {
            return results.length ? results[0] : null;
        })
    }

    public provideDefinition(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Definition> {
        return TemplatePathProvider.getTemplate(document, position, token).then(template => {
            if (! template) return null;
            return new Location(template, BEGIN_OF_FILE);
        })
    }
}
