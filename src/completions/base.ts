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
    workspace
} from 'vscode'

import { PYTHON_SELECTOR } from '../constants'
import { DjangoSnippet, readSnippets } from '../utils'

const settings = workspace.getConfiguration("django");

const exclusions: string[] = settings.snippets.exclude



export class DjangoCompletionItemProvider implements CompletionItemProvider {
    public selector: DocumentFilter = PYTHON_SELECTOR
    directory: string = ''
    files: string[] = []
    snippets: DjangoSnippet[] = []

    loadSnippets() {
        if (! settings.snippets.use) return
        if (exclusions.some(word => this.directory.includes(word))) return

        this.snippets = Array.prototype.concat(...this.files
            .filter(file => ! exclusions.some(word => file.includes(word)))
            .map(file => readSnippets(`${this.directory}/${file}`))
        )
        if (! settings.i18n) {
            this.snippets = this.snippets.map(snippet => {
                snippet.body = snippet.body.replace(/_\("(\S*)"\)/g, '"$1"');
                return snippet
            })
        }
    }

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