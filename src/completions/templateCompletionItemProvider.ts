'use strict'

import {
    CompletionItem,
    CompletionItemKind,
    CompletionItemProvider,
    MarkdownString,
    SnippetString,
    Uri,
    workspace,
} from 'vscode'
import { HTML_TEMPLATE_SELECTOR } from '../constants'

interface TemplateSnippet {
    prefix: string
    body: string | string[]
    description: string
}

const FILES = ['tags.json', 'filters.json']

// django-html gets the template snippets from package.json, but snippets contributed for
// "html" would show up in every HTML file: this provider only serves templates.
export class TemplateSnippetsCompletionItemProvider implements CompletionItemProvider {

    public selector = HTML_TEMPLATE_SELECTOR
    private items: Promise<CompletionItem[]>

    constructor(extensionUri: Uri) {
        this.items = Promise.all(FILES.map(async file => {
            const buffer = await workspace.fs.readFile(Uri.joinPath(extensionUri, 'snippets/templates', file))
            const snippets: Record<string, TemplateSnippet | string> = JSON.parse(new TextDecoder('utf-8').decode(buffer))
            return Object.values(snippets).filter(snippet => typeof snippet !== 'string').map(buildItem)
        })).then(lists => lists.flat())
    }

    public provideCompletionItems(): Promise<CompletionItem[]> {
        return this.items
    }
}

function buildItem(snippet: TemplateSnippet): CompletionItem {
    const item = new CompletionItem(snippet.prefix, CompletionItemKind.Snippet)
    const body = Array.isArray(snippet.body) ? snippet.body.join('\n') : snippet.body
    item.insertText = new SnippetString(body)
    item.detail = snippet.description
    item.documentation = new MarkdownString().appendCodeblock(body, 'django-html')
    return item
}
