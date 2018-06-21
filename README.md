# Django extension for Visual Studio Code

> Beautiful syntax and snippets for perfectionists with deadlines

## Usage

Configure you file association for `Django HTML` in the **Language Mode** menu
or drop this in your settings for more precision:

```json
"files.associations": {
    "**/templates/*.html": "django-html",
    "**/templates/*": "django-txt",
    "**/requirements{/**,*}.{txt,in}": "pip-requirements"
},
```

Emmet enthusiasts should have this to their configuration as well:

```json
"emmet.includeLanguages": {"django-html": "html"},
```

## Features

### Go to definition in templates

Ctrl-click or press F12 on the template path in a `include` or `extends` tag
to jump to this template

### Improved syntax

- Adds the filetype `django-html` 
- Adds the filetype `django-txt` for email templates.
- Better syntax with more operators and default keywords:
  - Known default tags and filters
  - Known templatetags namespace from contrib in the {% load %} tag
  - Known keywords in tags, like: `as`, `asvar`, `with`, `trimmed`…
- Syntax highlighting everywhere in your HTML document:
  - In the HTML tag itself"
  - In the id, class or any attribute
  - In inline CSS or Javascript code

![Syntax with Gruvbox](images/django-html-syntax-gruvbox.png)
![Syntax with Monokai](images/django-html-syntax-monokai.png)

### Snippets

- No unnecessary new lines
- Support for selected text (when inserting snippet from the menu)
- Support for copied text