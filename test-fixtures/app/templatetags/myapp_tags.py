from django import template

register = template.Library()


@register.tag("custom_tag")
def do_custom_tag(parser, tokens):
    """A tag whose registered name differs from its function."""


@register.simple_tag(takes_context=True, name="shout")
def make_shout(context, text):
    return text.upper()


@register.simple_tag
@register.simple_tag(name="whisper")
def lower(text):
    return text.lower()
