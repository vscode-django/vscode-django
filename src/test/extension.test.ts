'use strict'

import * as assert from 'assert'
import * as toml from 'toml'
import {
    commands,
    CompletionList,
    ConfigurationTarget,
    extensions,
    FileType,
    Location,
    LocationLink,
    Position,
    TextEdit,
    Uri,
    workspace,
} from 'vscode'

const EXTENSION_ID = 'batisteo.vscode-django'

const fixture = (path: string) => Uri.joinPath(workspace.workspaceFolders![0].uri, path)
const read = async (uri: Uri) => new TextDecoder('utf-8').decode(await workspace.fs.readFile(uri))

async function listFiles(dir: Uri, extension: string): Promise<Uri[]> {
    const files: Uri[] = []
    for (const [name, type] of await workspace.fs.readDirectory(dir)) {
        const uri = Uri.joinPath(dir, name)
        if (type === FileType.Directory) files.push(...await listFiles(uri, extension))
        else if (name.endsWith(extension)) files.push(uri)
    }
    return files
}

// Snippets and language servers load asynchronously after activation, so poll until the expected items show up
async function completionLabels(path: string, position: Position, ...expected: string[]): Promise<string[]> {
    const document = await workspace.openTextDocument(fixture(path))
    let labels: string[] = []
    for (let attempt = 0; attempt < 40 && !expected.every(label => labels.includes(label)); attempt++) {
        if (attempt) await new Promise(resolve => setTimeout(resolve, 250))
        const list = await commands.executeCommand<CompletionList>(
            'vscode.executeCompletionItemProvider', document.uri, position)
        labels = list!.items.map(item => {
            const label = item.label as string | { label: string }
            return typeof label === 'string' ? label : label.label
        })
    }
    return labels
}

suite('vscode-django', () => {

    // Runs first: nothing else has started the extension yet
    test('the extension starts when a template opens', async () => {
        const extension = extensions.getExtension(EXTENSION_ID)!
        assert.ok(!extension.isActive, 'the extension started before any file was opened')
        await workspace.openTextDocument(fixture('app/templates/app/page.html'))
        for (let i = 0; i < 40 && !extension.isActive; i++) await new Promise(resolve => setTimeout(resolve, 250))
        assert.ok(extension.isActive, 'the extension did not start on an HTML template')
    })

    test('templates open as HTML, to keep the HTML features', async () => {
        const document = await workspace.openTextDocument(fixture('app/templates/app/page.html'))
        assert.strictEqual(document.languageId, 'html')
    })

    test('Django tags get bracket pair colors in HTML', () => {
        const pairs = workspace.getConfiguration('editor', { languageId: 'html' }).get('language.colorizedBracketPairs')
        assert.deepStrictEqual(pairs, [['{%', '%}'], ['{{', '}}']])
    })

    test('template snippets are offered in templates', async () => {
        // After "<", the tag names come from VS Code's HTML language features
        const labels = await completionLabels('app/templates/app/complete.html', new Position(1, 1), 'autoescape', 'blockquote')
        assert.ok(labels.includes('autoescape'), `autoescape not in ${labels.length} items`)
        assert.ok(labels.includes('blockquote'), 'HTML completions are missing')
    })

    test('template snippets are not offered in other HTML files', async () => {
        const labels = await completionLabels('static/index.html', new Position(1, 1), 'blockquote')
        assert.ok(labels.includes('blockquote'), 'HTML completions are missing')
        assert.ok(!labels.includes('autoescape'), 'template snippets leaked into a non-template HTML file')
    })

    test('Emmet is enabled in django-html by default', () => {
        const languages = workspace.getConfiguration('emmet').get<Record<string, string>>('includeLanguages')
        assert.strictEqual(languages?.['django-html'], 'html')
    })

    test('go to definition on an extends path', async () => {
        const document = await workspace.openTextDocument(fixture('app/templates/app/page.html'))
        const results = await commands.executeCommand<(Location | LocationLink)[]>(
            'vscode.executeDefinitionProvider', document.uri, new Position(0, 15))
        assert.strictEqual(results!.length, 1)
        const target = 'uri' in results![0] ? results![0].uri : results![0].targetUri
        assert.strictEqual(target.path, fixture('app/templates/app/base.html').path)
    })

    test('go to definition on a cotton component', async () => {
        const document = await workspace.openTextDocument(fixture('app/templates/app/page.html'))
        const line = document.getText().split('\n').findIndex(l => l.includes('<c-forms.text-input'))
        const character = document.lineAt(line).text.indexOf('text-input')
        const results = await commands.executeCommand<(Location | LocationLink)[]>(
            'vscode.executeDefinitionProvider', document.uri, new Position(line, character))
        assert.strictEqual(results!.length, 1)
        const target = 'uri' in results![0] ? results![0].uri : results![0].targetUri
        assert.strictEqual(target.path, fixture('app/templates/cotton/forms/text_input.html').path)
    })

    test('templates are formatted with django.format.command', async () => {
        // Stands in for djlint or djangofmt: squeezes the spaces inside the tags
        const squeeze = "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(s.replace(/{%\\s+(.*?)\\s+%}/g,'{% $1 %}')))"
        const config = workspace.getConfiguration('django')
        await config.update('format.command', ['node', '-e', squeeze], ConfigurationTarget.Workspace)
        try {
            const document = await workspace.openTextDocument(fixture('app/templates/app/unformatted.html'))
            // The formatter is registered for HTML templates once the setting changes
            let edits: TextEdit[] | undefined
            for (let attempt = 0; attempt < 20 && !edits?.length; attempt++) {
                if (attempt) await new Promise(resolve => setTimeout(resolve, 250))
                edits = await commands.executeCommand<TextEdit[]>(
                    'vscode.executeFormatDocumentProvider', document.uri, { tabSize: 4, insertSpaces: true })
            }
            let text = document.getText()
            for (const edit of [...edits!].sort((a, b) => document.offsetAt(b.range.start) - document.offsetAt(a.range.start))) {
                text = text.slice(0, document.offsetAt(edit.range.start)) + edit.newText + text.slice(document.offsetAt(edit.range.end))
            }
            assert.strictEqual(text, '{% if title %}{{ title }}{% endif %}\n')
        } finally {
            await config.update('format.command', undefined, ConfigurationTarget.Workspace)
        }
    })

    test('model snippets are offered in models.py', async () => {
        const labels = await completionLabels('app/models.py', new Position(4, 4), 'char_field')
        assert.ok(labels.includes('char_field'), `char_field not in ${labels.length} items`)
        assert.ok(!labels.includes('class_createview'), 'view snippets leaked into models.py')
    })

    test('view snippets are offered in views.py', async () => {
        const labels = await completionLabels('app/views.py', new Position(1, 0), 'class_createview')
        assert.ok(labels.includes('class_createview'), `class_createview not in ${labels.length} items`)
    })

    test('every bundled snippet and grammar file parses', async () => {
        const root = extensions.getExtension(EXTENSION_ID)!.extensionUri
        const snippets = await listFiles(Uri.joinPath(root, 'completions/snippets'), '.toml')
        const json = [
            ...await listFiles(Uri.joinPath(root, 'snippets/templates'), '.json'),
            ...await listFiles(Uri.joinPath(root, 'syntaxes'), '.json'),
        ]
        assert.ok(snippets.length > 20, `only ${snippets.length} snippet files`)
        assert.ok(json.length >= 4, `only ${json.length} json files`)
        for (const uri of snippets) {
            const parsed = toml.parse(await read(uri))
            assert.ok(Array.isArray(parsed.snippets) && parsed.snippets.length, uri.path)
        }
        for (const uri of json) {
            const text = await read(uri)
            assert.doesNotThrow(() => JSON.parse(text), uri.path)
        }
    })
})
