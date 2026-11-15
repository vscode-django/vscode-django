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

// Snippets are loaded asynchronously after activation, so poll until the expected one shows up
async function completionLabels(path: string, position: Position, expected: string): Promise<string[]> {
    const document = await workspace.openTextDocument(fixture(path))
    let labels: string[] = []
    for (let attempt = 0; attempt < 20 && !labels.includes(expected); attempt++) {
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

    suiteSetup(async () => {
        await extensions.getExtension(EXTENSION_ID)!.activate()
    })

    test('templates folder opens as django-html', async () => {
        const document = await workspace.openTextDocument(fixture('app/templates/app/page.html'))
        assert.strictEqual(document.languageId, 'django-html')
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
            const edits = await commands.executeCommand<TextEdit[]>(
                'vscode.executeFormatDocumentProvider', document.uri, { tabSize: 4, insertSpaces: true })
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
