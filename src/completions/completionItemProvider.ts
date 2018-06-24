'use strict';

import {
    CompletionItemProvider,
    CancellationToken,
    CompletionContext,
    CompletionItem,
    CompletionItemKind,
    DocumentFilter,
    MarkdownString,
    Position,
    SnippetString,
    TextDocument,
} from 'vscode';

import { readSnippets } from '../utils';

interface DjangoSnippet {
    prefix: string
    body: string
    detail: string
    description: string
}


class DjangoCompletionItemProvider implements CompletionItemProvider {

    snippets: DjangoSnippet[] = [];

    private buildSnippet(snippet: DjangoSnippet): CompletionItem {
        let item = new CompletionItem(snippet.prefix, CompletionItemKind.Snippet);
        item.insertText = new SnippetString(snippet.body);
        item.detail = snippet.detail;
        item.documentation = new MarkdownString(snippet.description);
        return item
    }

    public async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): Promise<CompletionItem[]> {
        return this.snippets.map(this.buildSnippet);
    }
}

export class DjangoModelCompletionItemProvider extends DjangoCompletionItemProvider {

    public selector: DocumentFilter = { pattern: '**/models{**/,}*.py', scheme: 'file', language: 'python'};

    constructor () {
        super();
        this.snippets = [
            ...readSnippets('models/fields.toml'),
            ...readSnippets('models/fields-postgres.toml'),
            ...readSnippets('models/classes.toml'),
            ...readSnippets('models/methods.toml'),
            ...readSnippets('models/imports.toml'),
        ]
    }

}