'use strict'

import { ExtensionContext, languages } from 'vscode'
import { TemplatePathProvider } from './providers/definitionProvider'
import {
    DjangoAdminCompletionItemProvider,
    DjangoFormCompletionItemProvider,
    DjangoManagerCompletionItemProvider,
    DjangoModelCompletionItemProvider,
    DjangoPythonCompletionItemProvider,
    DjangoViewCompletionItemProvider,
    DjangoUrlCompletionItemProvider,
} from './completions/completionItemProvider'


export function activate(context: ExtensionContext): void {
    const definitions = new TemplatePathProvider()
    context.subscriptions.push(languages.registerDefinitionProvider(definitions.selector, definitions))
    
    const djangoPythonSnippets = new DjangoPythonCompletionItemProvider()
    context.subscriptions.push(languages.registerCompletionItemProvider(djangoPythonSnippets.selector, djangoPythonSnippets))

    const djangoAdminSnippets = new DjangoAdminCompletionItemProvider()
    context.subscriptions.push(languages.registerCompletionItemProvider(djangoAdminSnippets.selector, djangoAdminSnippets))

    const djangoFormSnippets = new DjangoFormCompletionItemProvider()
    context.subscriptions.push(languages.registerCompletionItemProvider(djangoFormSnippets.selector, djangoFormSnippets))

    const djangoManagerSnippets = new DjangoManagerCompletionItemProvider()
    context.subscriptions.push(languages.registerCompletionItemProvider(djangoManagerSnippets.selector, djangoManagerSnippets))

    const djangoModelSnippets = new DjangoModelCompletionItemProvider()
    context.subscriptions.push(languages.registerCompletionItemProvider(djangoModelSnippets.selector, djangoModelSnippets))

    const djangoViewSnippets = new DjangoViewCompletionItemProvider()
    context.subscriptions.push(languages.registerCompletionItemProvider(djangoViewSnippets.selector, djangoViewSnippets))

    const djangoUrlSnippets = new DjangoUrlCompletionItemProvider()
    context.subscriptions.push(languages.registerCompletionItemProvider(djangoUrlSnippets.selector, djangoUrlSnippets))
}
