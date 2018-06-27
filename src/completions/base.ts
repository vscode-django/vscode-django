'use strict';

import {
    CompletionItemProvider,
    CancellationToken,
    CompletionContext,
    CompletionItem,
    CompletionItemKind,
    MarkdownString,
    Position,
    SnippetString,
    TextDocument,
} from 'vscode'

interface DjangoSnippet {
    prefix: string
    body: string
    detail: string
    description: string
}


export class DjangoCompletionItemProvider implements CompletionItemProvider {

    snippets: DjangoSnippet[] = []

    private buildSnippet(snippet: DjangoSnippet): CompletionItem {
        let item = new CompletionItem(snippet.prefix, CompletionItemKind.Snippet);
        item.insertText = new SnippetString(snippet.body);
        item.detail = snippet.detail;
        item.documentation = new MarkdownString(snippet.description);
        return item
    }

    public async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): Promise<CompletionItem[]> {
        return this.snippets.map(this.buildSnippet)
    }
}