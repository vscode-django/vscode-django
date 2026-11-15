# Django extension for Visual Studio Code

> Beautiful syntax and scoped snippets for perfectionists with deadlines

![Syntax with Gruvbox](images/vscode-django-syntax-gruvbox.png)

## Features

### Templates stay HTML

Your templates open as regular HTML files, with the Django syntax highlighted on top:
tags, variables, filters and comments, even inside attributes, `<style>` and `<script>`.

Everything VS Code and your other extensions do for HTML keeps working in templates:
tag and attribute completion, auto-closing and linked editing of tags, Emmet, the CSS color picker,
Tailwind CSS, Alpine.js, htmx…

The Django syntax is highlighted in every HTML file, while the features below are only active
in templates, which are the files in a `templates` or `jinja2` folder.
Other templates, like emails in `.txt` files, use the `django-txt` language.

### Go to definition

Ctrl+click (Cmd+click on macOS) or press F12 on a template path, like in an `{% include %}`
or `{% extends %}` tag or in a view, to jump to this template.

It also works on [django-cotton](https://django-cotton.com) components, like `<c-card>` or `<c-forms.text-input />`.
Set `django.cotton.dir` if you changed `COTTON_DIR`.

### Snippets

- Template tags and filters in templates.
- Python snippets in `models.py`, `views.py`, `forms.py`, `admin.py`, `urls.py`, migrations…
  each file only gets the snippets that make sense there.
- Snippets use the selected or copied text when it fits, without unnecessary new lines.

### Formatting

The extension can format templates with the tool your project already uses.
Install one of them, then set `django.format.command` to a command that reads the template on stdin
and writes the result on stdout:

| Tool                                                      | `django.format.command`         | Formats                |
| --------------------------------------------------------- | ------------------------------- | ---------------------- |
| [djLint](https://github.com/djlint/djlint)                | `["djlint", "-", "--reformat"]` | HTML and template tags |
| [djangofmt](https://github.com/UnknownPlatypus/djangofmt) | `["djangofmt", "-"]`            | HTML and template tags |
| [djade](https://github.com/adamchainz/djade)              | `["djade", "-"]`                | Template tags only     |
| [DjHTML](https://github.com/rtts/djhtml)                  | `["djhtml", "-"]`               | Indentation only       |

Tools installed in the project `.venv` are found first. Each tool reads its own configuration,
like `[tool.djlint]` in `pyproject.toml`, so the editor formats like your pre-commit hooks and CI.

Templates are HTML files, so VS Code's HTML formatter can format them too, but it doesn't know the
Django syntax. Once `django.format.command` is set, choose **Django** when VS Code asks which formatter
to use for HTML files. Formatting runs on your machine, so it is not available in VS Code for the Web.

You can also use [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
with [prettier-plugin-jinja-template](https://github.com/davidodenwald/prettier-plugin-jinja-template).

## Settings

| Setting                 | Default               | Description                                                     |
| ----------------------- | --------------------- | --------------------------------------------------------------- |
| `django.snippets.use`     | `true`                | Python snippets                                                 |
| `django.snippets.exclude` | `["cms", "wagtail"]`  | Python snippet files to leave out, like `import` or `postgres`  |
| `django.i18n`             | `true`                | Wrap strings in `_("")` in the Python snippets                  |
| `django.cotton.dir`       | `"cotton"`            | Folder of the django-cotton components, like `COTTON_DIR`       |
| `django.format.command`   | `[]`                  | Command that formats templates, see [Formatting](#formatting)   |

## Upgrading from 1.x

Before 2.0, templates used a separate `django-html` language, which hid them from VS Code's HTML
features and HTML extensions. Templates are now HTML files, so:

- settings you scoped to `"[django-html]"` should move to `"[html]"`,
- the `emmet.includeLanguages` and `files.associations` workarounds are no longer needed,
- HTML comments toggle with <kbd>Ctrl</kbd> + <kbd>/</kbd>, as in any HTML file.

To get the 1.x behavior back, open your templates as `django-html`:

```json
"files.associations": {
    "**/templates/**/*.html": "django-html"
}
```

## Tricks

### Gettext and internationalization

Dealing with `django.po` files?
Consider installing the [Gettext extension](https://marketplace.visualstudio.com/items?itemName=mrorz.language-gettext) by MrOrz.

## Sponsors

- [tpberntsen](https://github.com/tpberntsen)
- [moving-content](https://github.com/moving-content)

[![Paypal](https://img.shields.io/static/v1?label=Paypal&message=€66&logo=Paypal&color=009cde&link=https://www.paypal.com/paypalme/batisteo/5)](https://www.paypal.com/paypalme/batisteo/5)
[![Github Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=6%C2%A0%E2%9D%A4&logo=GitHub&color=ea4aaa&link=https://github.com/sponsor/batisteo)](https://github.com/sponsor/batisteo)

## Contributing

### Issues

Something odd? New feature request?
Please [create an issue on GitHub](https://github.com/vscode-django/vscode-django/issues/new).

### Setup

```bash
git clone https://github.com/vscode-django/vscode-django
cd vscode-django
yarn install
code .
```

It’s better to have [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) installed.
Press <kbd>F5</kbd> to launch a VS Code window with the extension, and
<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F5</kbd> to reload it after a change.

### Running the tests

```bash
yarn test
```

This compiles and lints, then runs two kinds of tests:

- the grammar tests from `test/` with [Vitest](https://vitest.dev), which tokenize templates
  like VS Code does. Run `yarn test:unit` to keep them running while you edit a grammar.
- the extension tests from `src/test` in a downloaded VS Code, with `test-fixtures` as workspace.

The CI runs them all on every push and pull request.

### Editing the grammars

The `syntaxes/*.tmLanguage.json` files are generated. Edit the TOML sources in `syntaxes/`, then run:

```bash
uv run syntaxes/build.py
```

`django-html-injection` is the grammar used in HTML templates: it adds the Django syntax to VS Code's
HTML grammar. `django-html` and `django-txt` are full grammars for the languages of the same names.

### Releasing

1. Bump `version` in `package.json` and describe the changes in `CHANGELOG.md`, then commit and push.
2. Run `make publish`. It tags the version (`1.17` for `1.17.0`) and creates the GitHub release
   with the notes from the changelog. `make prerelease` does the same for a pre-release.
3. The release triggers the [Publish workflow](.github/workflows/publish.yml), which tests,
   packages and publishes the extension to the Marketplace through
   [trusted publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension),
   without any stored token. A GitHub pre-release is published as a Marketplace pre-release.
