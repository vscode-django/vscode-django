'use strict';

import { ExtensionContext, languages } from 'vscode';
import { TemplatePathProvider } from './providers/definitionProvider';
import {
    DjangoFormCompletionItemProvider,
    DjangoModelCompletionItemProvider,
} from './completions/completionItemProvider';


export function activate(context: ExtensionContext): void {
    console.log("vscode-django activated");
    const definitions = new TemplatePathProvider();
    const djangoFormSnippets = new DjangoFormCompletionItemProvider();
    const djangoModelSnippets = new DjangoModelCompletionItemProvider();

    context.subscriptions.push(languages.registerDefinitionProvider(definitions.selector, definitions))
    context.subscriptions.push(languages.registerCompletionItemProvider(djangoFormSnippets.selector, djangoFormSnippets));
    context.subscriptions.push(languages.registerCompletionItemProvider(djangoModelSnippets.selector, djangoModelSnippets));
}
