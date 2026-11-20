import { describe, expect, test } from 'vitest'
import { scopesOf, tokenize } from './tokenize'

// Templates keep the "html" language: the Django syntax is injected into VS Code's HTML grammar.
// The grammar of the "html" language is text.html.derivative, which includes text.html.basic.
const html = (source: string) => tokenize('text.html.derivative', source)

describe('Django syntax injected in HTML', () => {

    test('template tags between HTML tags', async () => {
        const tokens = await html('<ul>{% for item in items %}<li>{{ item }}</li>{% endfor %}</ul>')
        expect(scopesOf(tokens, 'for')).toContain('keyword.control.tag-name.django')
        expect(scopesOf(tokens, 'li')).toContain('entity.name.tag.html')
        expect(scopesOf(tokens, '{{')).toContain('entity.tag.tagbraces.django')
    })

    test('variables in attribute values', async () => {
        const tokens = await html('<a href="{% url \'home\' %}" class="{{ css }}">Home</a>')
        expect(scopesOf(tokens, 'url')).toContain('keyword.control.tag-name.django')
        expect(scopesOf(tokens, 'href')).toContain('entity.other.attribute-name.html')
    })

    test('template tags in place of attributes', async () => {
        const tokens = await html('<input type="checkbox" {% if checked %}checked{% endif %}>')
        expect(scopesOf(tokens, 'if')).toContain('keyword.control.tag-name.django')
        expect(scopesOf(tokens, 'type')).toContain('entity.other.attribute-name.html')
    })

    test('CSS and template tags in <style>', async () => {
        const tokens = await html('<style>\n{% if dark %}body { color: white; }{% endif %}\n</style>')
        expect(scopesOf(tokens, 'if')).toContain('keyword.control.tag-name.django')
        expect(scopesOf(tokens, 'color')).toContain('support.type.property-name.css')
    })

    test('JavaScript and variables in <script>', async () => {
        const tokens = await html('<script>\nconst url = "{{ api_url }}";\nlet count = 0;\n</script>')
        expect(scopesOf(tokens, '{{')).toContain('entity.tag.tagbraces.django')
        expect(scopesOf(tokens, 'let')).toContain('storage.type.js')
    })

    test('comments', async () => {
        const tokens = await html('{# a note #}<p></p>')
        expect(scopesOf(tokens, '{# a note #}')).toContain('comment.line.number-sign.django')
    })

    test('nothing is highlighted inside a {% comment %} block', async () => {
        const tokens = await html('{% comment %}{% if a %}{% endcomment %}')
        expect(tokens.filter(token => token.scopes.includes('keyword.control.tag-name.django'))).toEqual([])
    })

    test('plain HTML is unchanged', async () => {
        const tokens = await html('<p class="intro">Hello</p>')
        expect(tokens.every(token => token.scopes.every(scope => !scope.includes('django')))).toBe(true)
    })
})
