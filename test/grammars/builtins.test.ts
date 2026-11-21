import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { tokenize } from './tokenize'

// The tags and filters of the Django docs, written by syntaxes/update_builtins.py
const docs = JSON.parse(readFileSync(join(__dirname, '../../data/django-docs.json'), 'utf8'))
const django = (source: string) => tokenize('text.html.django', source)

describe('the built-in tags and filters of the Django docs', () => {

    test('tags are highlighted as built-in tags', async () => {
        const missing: string[] = []
        for (const name of Object.keys(docs.tags)) {
            const tokens = await django(`{% ${name} %}`)
            // {% comment %} starts a block of comment, which is its own rule
            const found = name === 'comment'
                ? tokens.some(token => token.scopes.includes('comment.block.django'))
                : tokens.find(token => token.text === name)?.scopes.includes('keyword.control.tag-name.django')
            if (!found) missing.push(name)
        }
        expect(missing, 'run uv run syntaxes/update_builtins.py').toEqual([])
    })

    test('filters are highlighted as built-in filters', async () => {
        const missing: string[] = []
        for (const name of Object.keys(docs.filters)) {
            const tokens = await django(`{{ value|${name} }}`)
            if (!tokens.find(token => token.text === name)?.scopes.includes('keyword.control.filter.django')) missing.push(name)
        }
        expect(missing, 'run uv run syntaxes/update_builtins.py').toEqual([])
    })

    test('custom tags and filters have their own color', async () => {
        const tokens = await django('{% my_tag %}{{ value|my_filter }}')
        expect(tokens.find(token => token.text === 'my_tag')?.scopes).toContain('constant.other.tag.name.django')
        expect(tokens.find(token => token.text === 'my_filter')?.scopes).toContain('constant.other.filter.django')
    })
})
