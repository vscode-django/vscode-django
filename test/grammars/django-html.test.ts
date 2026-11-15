import { describe, expect, test } from 'vitest'
import { scopesOf, tokenize } from './tokenize'

const html = (source: string) => tokenize('text.html.django', source)

describe('django-html grammar', () => {

    test('template tags', async () => {
        const tokens = await html('{% if user.is_staff %}<p>Hi</p>{% endif %}')
        expect(scopesOf(tokens, '{%')).toContain('entity.tag.tagbraces.django')
        expect(scopesOf(tokens, 'if')).toContain('keyword.control.tag-name.django')
        expect(scopesOf(tokens, 'endif')).toContain('keyword.control.tag-name.django')
    })

    test('variables and filters', async () => {
        const tokens = await html('<p>{{ title|upper }}</p>')
        expect(scopesOf(tokens, '{{')).toContain('entity.tag.tagbraces.django')
        expect(tokens.some(token => token.text.includes('upper') && token.scopes.some(scope => scope.includes('django')))).toBe(true)
    })

    test('comments', async () => {
        const tokens = await html('{# a note #}<p></p>')
        expect(scopesOf(tokens, '{# a note #}')).toContain('comment.line.number-sign.django')
    })

    test('CSS in <style> tags (#43)', async () => {
        const tokens = await html('<style>\np { color: red; }\n</style>')
        expect(scopesOf(tokens, 'color')).toContain('support.type.property-name.css')
    })

    test('template tags in <style> tags', async () => {
        const tokens = await html('<style>\n{% if dark %}body { color: white; }{% endif %}\n</style>')
        expect(scopesOf(tokens, 'if')).toContain('keyword.control.tag-name.django')
    })

    test.each(['my-widget', 'c-card', 'c-forms.text-input', 'a-b'])('whole name of custom element <%s> (#98)', async name => {
        const tokens = await html(`<${name} class="x"></${name}>`)
        expect(scopesOf(tokens, name).some(scope => scope.startsWith('entity.name.tag'))).toBe(true)
    })
})

describe('django-txt grammar', () => {

    test('template tags and variables', async () => {
        const tokens = await tokenize('text.django', 'Hello {{ name }},\n{% if order %}Your order{% endif %}')
        expect(scopesOf(tokens, '{{')).toContain('entity.tag.tagbraces.django')
        expect(scopesOf(tokens, 'if')).toContain('keyword.control.tag-name.django')
    })
})
