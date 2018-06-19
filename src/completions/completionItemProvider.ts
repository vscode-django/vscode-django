'use strict';

import * as vscode from 'vscode';


export class DjangoModelCompletionItemProvider implements vscode.CompletionItemProvider {

    public selector = { pattern: '**/models{**/,}*.py', scheme: 'file', language: 'python'};

    public async createSnippetItem(): Promise<vscode.CompletionItem> {

        let item = new vscode.CompletionItem('Good part of the day', vscode.CompletionItemKind.Snippet);
        item.insertText = new vscode.SnippetString("Good ${1|morning,afternoon,evening|}.\n\tIt is ${1}, right?");
        item.documentation = new vscode.MarkdownString("Inserts a snippet that lets you select the _appropriate_ part of the day for your greeting.");

        return item;
    }

    public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext):
        Promise<vscode.CompletionItem[]> {
        return [
            new vscode.CompletionItem('Hello World!'),
            await this.createSnippetItem()
        ];
    }
}