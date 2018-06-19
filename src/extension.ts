'use strict';

import { ExtensionContext, languages } from 'vscode';
import { TemplatePathProvider } from './providers/definitionProvider';
import { DjangoModelCompletionItemProvider } from './completions/completionItemProvider';


export function activate(context: ExtensionContext): void {
    const definitions = new TemplatePathProvider();
    const djangoModelSnippets = new DjangoModelCompletionItemProvider();

    context.subscriptions.push(languages.registerDefinitionProvider(definitions.selector, definitions))
    context.subscriptions.push(languages.registerCompletionItemProvider(djangoModelSnippets.selector, djangoModelSnippets));
}
