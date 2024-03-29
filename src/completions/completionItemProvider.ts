'use strict';

import { PYTHON_SELECTOR } from '../constants'
import { SnippetProvider } from '../utils';
import { DjangoCompletionItemProvider } from './base'


export class DjangoPythonCompletionItemProvider extends DjangoCompletionItemProvider {

    public selector = PYTHON_SELECTOR
    directory = 'python'
    files = ["imports.toml", "utils.toml"]

    constructor (snippetPrvider: SnippetProvider) {
        super()
        this.loadSnippets(snippetPrvider)
    }
}


export class DjangoAdminCompletionItemProvider extends DjangoCompletionItemProvider {

    public selector = { pattern: '**/admin{**/,}*.py', ...PYTHON_SELECTOR }
    directory = "admin"
    files = ["classes.toml", "imports.toml", "options.toml"]

    constructor (snippetPrvider: SnippetProvider) {
        super()
        this.loadSnippets(snippetPrvider)
    }
}


export class DjangoFormCompletionItemProvider extends DjangoCompletionItemProvider {

    public selector = { pattern: '**/forms{**/,}*.py', ...PYTHON_SELECTOR }
    directory = "forms"
    files = ["classes.toml", "imports.toml", "fields.toml", "fields-postgres.toml", "methods.toml"]

    constructor (snippetPrvider: SnippetProvider) {
        super()
        this.loadSnippets(snippetPrvider)
    }
}


export class DjangoManagerCompletionItemProvider extends DjangoCompletionItemProvider {

    public selector = { pattern: '**/{models,managers,querysets}{**/,}*.py', ...PYTHON_SELECTOR }
    directory = "models"
    files = ["managers.toml"]

    constructor (snippetPrvider: SnippetProvider) {
        super()
        this.loadSnippets(snippetPrvider)
    }
}


export class DjangoMigrationCompletionItemProvider extends DjangoCompletionItemProvider {

    public selector = { pattern: '**/migrations/**/*.py', ...PYTHON_SELECTOR }
    directory = "models"
    files = ["migrations.toml"]

    constructor (snippetPrvider: SnippetProvider) {
        super()
        this.loadSnippets(snippetPrvider)
    }
}


export class DjangoModelCompletionItemProvider extends DjangoCompletionItemProvider {

    public selector = { pattern: '**/{models,migrations}{**/,}*.py', ...PYTHON_SELECTOR }
    directory = "models"
    files = ["classes.toml", "imports.toml", "fields.toml", "fields-postgres.toml", "methods.toml"]

    constructor (snippetPrvider: SnippetProvider) {
        super()
        this.loadSnippets(snippetPrvider)
    }
}


export class DjangoViewCompletionItemProvider extends DjangoCompletionItemProvider {

    public selector = { pattern: '**/views{**/,}*.py', ...PYTHON_SELECTOR }
    directory = "views"
    files = ["classes.toml", "imports.toml", "methods.toml"]

    constructor (snippetPrvider: SnippetProvider) {
        super()
        this.loadSnippets(snippetPrvider)
    }
}


export class DjangoTemplatetagsCompletionItemProvider extends DjangoCompletionItemProvider {

    public selector = { pattern: '**/templatetags/**/*.py', ...PYTHON_SELECTOR }
    directory = "templatetags"
    files = ["imports.toml", "methods.toml"]

    constructor (snippetPrvider: SnippetProvider) {
        super()
        this.loadSnippets(snippetPrvider)
    }
}


export class DjangoUrlCompletionItemProvider extends DjangoCompletionItemProvider {

    public selector = { pattern: '**/urls{**/,}*.py', ...PYTHON_SELECTOR }
    directory = "urls"
    files = ["imports.toml", "methods.toml", "regexes.toml"]

    constructor (snippetPrvider: SnippetProvider) {
        super()
        this.loadSnippets(snippetPrvider)
    }
}
