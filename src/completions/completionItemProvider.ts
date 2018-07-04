'use strict';

import { DocumentFilter } from 'vscode'

import { readSnippets } from '../utils'
import { DjangoCompletionItemProvider } from './base'


export class DjangoPythonCompletionItemProvider extends DjangoCompletionItemProvider {

    public selector: DocumentFilter = { scheme: 'file', language: 'python'}

    constructor () {
        super()
        this.snippets = [
            ...readSnippets('python/imports.toml'),
            ...readSnippets('python/utils.toml'),
        ]
    }
}

export class DjangoAdminCompletionItemProvider extends DjangoCompletionItemProvider {

    public selector: DocumentFilter = { pattern: '**/admin{**/,}*.py', scheme: 'file', language: 'python'}

    constructor () {
        super()
        this.snippets = [
            ...readSnippets('admin/classes.toml'),
            ...readSnippets('admin/imports.toml'),
            ...readSnippets('admin/options.toml'),
        ]
    }
}

export class DjangoFormCompletionItemProvider extends DjangoCompletionItemProvider {

    public selector: DocumentFilter = { pattern: '**/forms{**/,}*.py', scheme: 'file', language: 'python'}

    constructor () {
        super()
        this.snippets = [
            ...readSnippets('forms/classes.toml'),
            ...readSnippets('forms/imports.toml'),
            ...readSnippets('forms/fields.toml'),
            ...readSnippets('forms/fields-postgres.toml'),
            ...readSnippets('forms/methods.toml'),
        ]
    }
}

export class DjangoManagerCompletionItemProvider extends DjangoCompletionItemProvider {

    public selector: DocumentFilter = { pattern: '**/{models,managers,querysets}{**/,}*.py', scheme: 'file', language: 'python'}

    constructor () {
        super()
        this.snippets = [
            ...readSnippets('models/managers.toml'),
        ]
    }
}

export class DjangoModelCompletionItemProvider extends DjangoCompletionItemProvider {

    public selector: DocumentFilter = { pattern: '**/models{**/,}*.py', scheme: 'file', language: 'python'}

    constructor () {
        super()
        this.snippets = [
            ...readSnippets('models/classes.toml'),
            ...readSnippets('models/imports.toml'),
            ...readSnippets('models/fields.toml'),
            ...readSnippets('models/fields-postgres.toml'),
            ...readSnippets('models/methods.toml'),
        ]
    }
}

export class DjangoViewCompletionItemProvider extends DjangoCompletionItemProvider {

    public selector: DocumentFilter = { pattern: '**/views{**/,}*.py', scheme: 'file', language: 'python'}

    constructor () {
        super()
        this.snippets = [
            ...readSnippets('views/classes.toml'),
            ...readSnippets('views/imports.toml'),
            ...readSnippets('views/methods.toml'),
        ]
    }
}

export class DjangoTemplatetagsCompletionItemProvider extends DjangoCompletionItemProvider {

    public selector: DocumentFilter = { pattern: '**/templatetags/**/*.py', scheme: 'file', language: 'python'}

    constructor () {
        super()
        this.snippets = [
            ...readSnippets('templatetags/imports.toml'),
            ...readSnippets('templatetags/methods.toml'),
        ]
    }
}

export class DjangoUrlCompletionItemProvider extends DjangoCompletionItemProvider {

    public selector: DocumentFilter = { pattern: '**/urls{**/,}*.py', scheme: 'file', language: 'python'}

    constructor () {
        super()
        this.snippets = [
            ...readSnippets('urls/imports.toml'),
            ...readSnippets('urls/methods.toml'),
            ...readSnippets('urls/regexes.toml'),
        ]
    }
}