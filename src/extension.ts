'use strict';

import { ExtensionContext, languages } from 'vscode';
import { TemplatePathProvider } from './providers/definitionProvider';


export function activate(context: ExtensionContext): void {
    const definitionProvider = new TemplatePathProvider();

    context.subscriptions.push(languages.registerDefinitionProvider(definitionProvider.selector, definitionProvider))
}
