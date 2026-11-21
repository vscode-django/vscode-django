'use strict'

import * as assert from 'assert'
import * as toml from 'toml'
import {
    commands,
    CompletionList,
    ConfigurationTarget,
    DocumentLink,
    extensions,
    FileType,
    Location,
    LocationLink,
    Position,
    TextEdit,
    Uri,
    window,
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

    test('{% url %} and {% static %} links replace the HTML links', async () => {
        const document = await workspace.openTextDocument(fixture('app/templates/app/links.html'))
        const onLine = (links: DocumentLink[], line: number) => links.filter(link => link.range.start.line === line)
        // The link of the plain href on line 3 comes from VS Code's HTML language server: wait for it
        let links: DocumentLink[] = []
        for (let attempt = 0; attempt < 40 && !onLine(links, 2).length; attempt++) {
            if (attempt) await new Promise(resolve => setTimeout(resolve, 250))
            links = await commands.executeCommand<DocumentLink[]>('vscode.executeLinkProvider', document.uri, 10)
        }
        assert.strictEqual(onLine(links, 2).length, 1, 'the HTML links are missing')

        const url = onLine(links, 0)
        assert.strictEqual(url.length, 1, 'the HTML link to "{% url ... %}" is still there')
        assert.strictEqual(document.getText(url[0].range), "{% url 'app:detail' pk=1 %}")
        // app/urls.py has app_name = "app", project/urls.py also has a "detail" without namespace
        assert.strictEqual(url[0].target!.path, fixture('app/urls.py').path)

        const css = onLine(links, 1)
        assert.strictEqual(css.length, 1, 'the HTML link to "{% static ... %}" is still there')
        assert.strictEqual(css[0].target!.path, fixture('app/static/css/app.css').path)

        // The link opens urls.py on the name of the URL pattern
        await commands.executeCommand('vscode.open', url[0].target)
        const editor = window.activeTextEditor!
        const position = editor.selection.active
        assert.strictEqual(editor.document.uri.path, fixture('app/urls.py').path)
        assert.ok(editor.document.lineAt(position.line).text.slice(position.character).startsWith('name="detail"'),
            `opened at ${position.line}:${position.character}`)
    })

    // The links of a template, once VS Code's HTML language server has made its own
    const linksOf = async (path: string) => {
        const document = await workspace.openTextDocument(fixture(path))
        let links: DocumentLink[] = []
        for (let attempt = 0; attempt < 40 && !links.length; attempt++) {
            if (attempt) await new Promise(resolve => setTimeout(resolve, 250))
            links = await commands.executeCommand<DocumentLink[]>('vscode.executeLinkProvider', document.uri, 10)
        }
        const on = (line: number) => links.filter(link => link.range.start.line === line)
        return { document, links, on, text: (link: DocumentLink) => document.getText(link.range) }
    }
    const TAGS = fixture('app/templatetags/myapp_tags.py').path
    const DJANGO = fixture('env/lib/python3.15/site-packages/django').path
    const DOCS = 'https://docs.djangoproject.com/en/6.0/'

    test('custom tags link to the function that registers them', async () => {
        const { on, text } = await linksOf('app/templates/app/links.html')

        // @register.tag("custom_tag") on do_custom_tag: the name comes from the decorator, not from the function
        const custom = on(3)
        assert.strictEqual(custom.length, 1, 'the HTML link to the attribute value is still there')
        assert.strictEqual(text(custom[0]), 'custom_tag')
        assert.strictEqual(custom[0].target!.path, TAGS)
        assert.strictEqual(custom[0].target!.fragment, 'L7,5', 'should open on do_custom_tag')

        // @register.simple_tag(name="shout") on make_shout
        const shout = on(4)
        assert.strictEqual(shout.length, 1)
        assert.strictEqual(shout[0].target!.path, TAGS)
        assert.strictEqual(shout[0].target!.fragment, 'L12,5', 'should open on make_shout')

        // A package of the virtual environment: django_vite/templatetags/django_vite.py
        const vite = on(8)
        assert.strictEqual(vite.length, 1, 'the HTML link to the attribute value is still there')
        assert.strictEqual(text(vite[0]), 'vite_asset')
        assert.strictEqual(vite[0].target!.path, DJANGO + '_vite/templatetags/django_vite.py')
        assert.strictEqual(vite[0].target!.fragment, 'L7,5', 'should open on vite_asset')

        // Stacked decorators register two tags for one function: @register.simple_tag(name="whisper") on lower
        const whisper = on(6)
        assert.strictEqual(whisper.length, 1)
        assert.strictEqual(whisper[0].target!.path, TAGS)
        assert.strictEqual(whisper[0].target!.fragment, 'L18,5', 'should open on lower')
    })

    test('the tags and filters of Django link to its documentation, for the version of the project', async () => {
        const { on, text } = await linksOf('app/templates/app/links.html')

        // The version comes from django/__init__.py of the virtual environment: 6.0.5
        const tag = on(5)
        assert.strictEqual(tag.length, 1, 'only {% if %} has a link, not {% endif %} or {{ user }}')
        assert.strictEqual(text(tag[0]), 'if')
        assert.strictEqual(tag[0].target!.toString(), DOCS + 'ref/templates/builtins/#std-templatetag-if')

        const filters = on(7)
        assert.deepStrictEqual(filters.map(text), ['upper', 'intcomma'])
        assert.strictEqual(filters[0].target!.toString(), DOCS + 'ref/templates/builtins/#std-templatefilter-upper')
        assert.strictEqual(filters[1].target!.toString(), DOCS + 'ref/contrib/humanize/#std-templatefilter-intcomma')

        // {% block %} goes to the guide on template inheritance
        const { on: onPage, text: textOfPage } = await linksOf('app/templates/app/page.html')
        assert.strictEqual(textOfPage(onPage(2)[0]), 'block')
        assert.strictEqual(onPage(2)[0].target!.toString(), DOCS + 'ref/templates/language/#template-inheritance')

        // {% extends %} keeps going to the template, with go to definition
        const page = await workspace.openTextDocument(fixture('app/templates/app/page.html'))
        const pageLinks = await commands.executeCommand<DocumentLink[]>('vscode.executeLinkProvider', page.uri, 10)
        assert.deepStrictEqual(pageLinks.filter(link => link.range.start.line === 0), [])
    })

    test('{{ block.super }} links to the block of the parent template', async () => {
        const PAGE = fixture('app/templates/app/page.html').path

        // The parent defines the block: {% block content %} of page.html
        const child = await linksOf('app/templates/app/child.html')
        const [first, ...others] = child.on(1).filter(link => child.text(link) === 'block.super')
        assert.deepStrictEqual(others, [])
        assert.strictEqual(first.target!.path, PAGE)
        assert.strictEqual(first.target!.fragment, 'L3,10', 'should open on the name of the block')

        // middle.html does not override the block: the chain goes up to page.html
        const leaf = await linksOf('app/templates/app/leaf.html')
        const supers = leaf.on(1).filter(link => leaf.text(link) === 'block.super')
        // The one in {% block inner %} has no link: no parent template defines this block
        assert.strictEqual(supers.length, 1)
        assert.strictEqual(supers[0].range.start.character, leaf.document.lineAt(1).text.lastIndexOf('block.super'))
        assert.strictEqual(supers[0].target!.path, PAGE)
        assert.strictEqual(supers[0].target!.fragment, 'L3,10')
    })

    test('go to definition on the name of a tag', async () => {
        const document = await workspace.openTextDocument(fixture('app/templates/app/links.html'))
        const definitionAt = async (line: number, word: string) => {
            const results = await commands.executeCommand<(Location | LocationLink)[]>(
                'vscode.executeDefinitionProvider', document.uri, new Position(line, document.lineAt(line).text.indexOf(word) + 1))
            return results.map(result => 'uri' in result ? [result.uri.path, result.range.start.line, result.range.start.character]
                : [result.targetUri.path, result.targetSelectionRange!.start.line, result.targetSelectionRange!.start.character])
        }
        // A custom tag: do_custom_tag, registered with @register.tag("custom_tag")
        assert.deepStrictEqual(await definitionAt(3, 'custom_tag'), [[TAGS, 6, 4]])
        // A tag of Django opens its source, while Ctrl+click opens the documentation
        assert.deepStrictEqual(await definitionAt(5, 'if'), [[DJANGO + '/template/defaulttags.py', 12, 4]])
        assert.deepStrictEqual(await definitionAt(7, 'upper'), [])
    })

    test('go to definition on the libraries of {% load %}', async () => {
        const document = await workspace.openTextDocument(fixture('app/templates/app/load.html'))
        const definitionAt = async (line: number, word: string) => {
            const results = await commands.executeCommand<(Location | LocationLink)[]>(
                'vscode.executeDefinitionProvider', document.uri, new Position(line, document.lineAt(line).text.indexOf(word) + 1))
            return results.map(result => 'uri' in result ? result.uri.path : result.targetUri.path)
        }
        const i18n = DJANGO + '/templatetags/i18n.py'

        // A library of the project, then one of Django
        assert.deepStrictEqual(await definitionAt(0, 'myapp_tags'), [TAGS])
        assert.deepStrictEqual(await definitionAt(0, 'i18n'), [i18n])
        // A package of the virtual environment. lib64 is a link to lib: the same file is only found once
        assert.deepStrictEqual(await definitionAt(2, 'django_vite'), [DJANGO + '_vite/templatetags/django_vite.py'])
        // After "from" is the library, before it are the tags
        assert.deepStrictEqual(await definitionAt(1, 'i18n'), [i18n])
        assert.deepStrictEqual(await definitionAt(1, 'trans'), [])
        // The name of the tag itself goes to its function, like any other tag
        assert.deepStrictEqual(await definitionAt(1, 'load'), [DJANGO + '/template/defaulttags.py'])

        // No documentation link on {% load %}: each library has its own definition
        const links = await commands.executeCommand<DocumentLink[]>('vscode.executeLinkProvider', document.uri, 10)
        assert.deepStrictEqual(links, [])
    })

    suite('go to references', () => {
        const referencesAt = async (path: string, line: number, word: string) => {
            const document = await workspace.openTextDocument(fixture(path))
            const character = document.lineAt(line).text.indexOf(word) + 1
            const locations = await commands.executeCommand<Location[]>(
                'vscode.executeReferenceProvider', document.uri, new Position(line, character))
            // The file and the line of each usage, without the definition of a tag
            return [...new Set(locations.map(location => `${location.uri.path.split('/').pop()}:${location.range.start.line}`))]
                .filter(reference => !reference.startsWith('myapp_tags.py')).sort()
        }

        test('where a custom tag is used', async () => {
            assert.deepStrictEqual(await referencesAt('app/templates/app/links.html', 3, 'custom_tag'), ['links.html:3', 'refs.html:1'])
        })

        test('where the function of a tag is used', async () => {
            assert.deepStrictEqual(await referencesAt('app/templatetags/myapp_tags.py', 6, 'do_custom_tag'), ['links.html:3', 'refs.html:1'])
        })

        test('where a block is defined or overridden', async () => {
            assert.deepStrictEqual(await referencesAt('app/templates/app/page.html', 2, 'content'),
                ['base.html:2', 'child.html:1', 'complete.html:0', 'leaf.html:1', 'page.html:2', 'refs.html:1'])
        })

        test('where a template is extended, included or rendered', async () => {
            const expected = ['page.html:0', 'refs.html:0', 'render.py:4']
            assert.deepStrictEqual(await referencesAt('app/templates/app/page.html', 0, 'app/base.html'), expected)
            assert.deepStrictEqual(await referencesAt('app/render.py', 4, 'app/base.html'), expected)
        })
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
