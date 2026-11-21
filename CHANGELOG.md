# Change Log
All notable changes to the "django" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added
- Ctrl+click on the name of a tag or a filter of Django, like `{% firstof %}` or `|date`, opens its page in the
  Django documentation, for the version of Django of the project (the stable version when it is not known).
- F12 on the name of a tag opens the function that registers it: in the `templatetags` modules of the workspace,
  or, when the virtual environment is inside the workspace, in the source of Django and of the installed packages,
  like django-vite.
- Ctrl+click on the name of a custom tag, like `{% custom_tag "app.js" %}`, opens the same function.
  In HTML attributes, these links replace the HTML links to files that don't exist.
- Go to definition on the libraries of `{% load %}`, like `myapp_tags`, `i18n` or `django_vite`, opens the
  `templatetags` module, once even when the virtual environment has `lib64` as a link to `lib`.
- Ctrl+click on `block.super` of `{{ block.super }}` opens the block of the parent template, going up the
  `{% extends %}` chain to the first template that defines it. `{% block %}` links to the guide on template inheritance.
- Go to references (Shift+F12): where a custom tag is used, where a block is defined or overridden, and where a template
  is extended, included or rendered.
- `uv run syntaxes/update_builtins.py` updates the built-in tags and filters of the grammar and the links to the
  documentation from the latest stable version of Django. A weekly workflow (Fridays) opens a pull request when they change.

### Changed
- The grammar knows the tags and filters of Django 6.1, like `now`, `translate`, `blocktranslate`, `cache`,
  `localtime`, `partial`, `querystring`, `json_script` or `truncatechars`, and `{% endfilter %}`.

## [2.0.2] - 2026-11-20

Published as a pre-release on the Marketplace.

### Added
- Ctrl+click on `{% url %}` opens the URL pattern in `urls.py`, and on `{% static %}` the static file.
  In HTML attributes, these links replace the HTML links to files that don't exist.

## [2.0.1] - 2026-11-20

Published as a pre-release on the Marketplace.

### Fixed
- The Django syntax is highlighted in templates again: the injection targets the root grammar of the `html` language.
- The extension starts when an HTML file opens, not only when a Django file or a Python file does.
- Django tags get bracket pair colors in HTML files, like in `django-html`.
- The `django.format.command` description refers to templates, not `django-html`.

### Changed
- The README explains how other HTML extensions and the activation change when upgrading from 1.x.

## [2.0.0] - 2026-11-15

Published as a pre-release on the Marketplace.

### Changed
- Templates open as HTML instead of `django-html`, with the Django syntax highlighted on top of
  VS Code's HTML grammar. VS Code's HTML features and HTML extensions now work in templates:
  tag and attribute completion, auto-closing and linked editing of tags, Emmet, the color picker,
  Tailwind CSS, Alpine.js… (#16, #34, #70, #102, #105, #110, #113, #114, #124, #125, #143, #146, #172, #180, #182, #187, #192).
- Template snippets, go to definition and formatting work in HTML files in `templates` and `jinja2` folders.
- `django-html` is still available: set it in `files.associations` to get the 1.x behavior back.
- Requires VS Code 1.63 or later.

## [1.19.0] - 2026-11-15

### Added
- Emmet is enabled in `django-html` templates by default, no setting needed (#131, #152).

### Changed
- Grammar tests with Vitest, and CI runs all tests on every push and pull request.

## [1.18.0] - 2026-11-15

### Added
- Format `django-html` templates with djLint, djangofmt, djade, DjHTML or any other tool, set with `django.format.command` (#112).

### Fixed
- CSS inside `<style>` tags is highlighted again (#43, #111).
- Tags with a hyphen, like custom elements or `<c-card>`, are no longer cut at the hyphen (#98).

### Changed
- The grammar build script runs with uv instead of Poetry.

## [1.17.0] - 2026-11-15

### Added
- Go to definition on [django-cotton](https://django-cotton.com) components, like `<c-card>` or `<c-forms.text-input />`. Set `django.cotton.dir` if you changed `COTTON_DIR`.

### Changed
- Releases are published from GitHub Actions with Marketplace trusted publishing.

## [1.16.0] - 2026-11-15

### Fixed
- Python snippets now load in VS Code for the Web (vscode.dev, github.dev).
- The web extension bundle is now rebuilt on every publish.

### Changed
- Snippet files are now read with a strict TOML 1.1 parser (toml 5).
- Upgraded all dependencies. The extension is built with TypeScript 7 and linted with ESLint 10.
- Added smoke tests, run with `yarn test`.

## [1.15.0] - 2023-12-27

### Added
- `cache`, `cache_selection`, `startcache` and `endcache` template tag snippets.

### Fixed
- JSON syntax error in the template tag snippets.

## [1.14.0] - 2023-09-30

### Changed
- Improved the `elif` template tag snippet.

## [1.13.0] - 2023-09-18

### Added
- `get_template_names`, `form_valid` and `form_invalid` view method snippets.

### Fixed
- Escaped double quotes in template tag snippet descriptions.
- JSON errors in the template tag snippets.

## [1.12.0] - 2023-09-18

### Added
- `include_with` template tag snippet.

## [1.11.0] - 2023-09-11

### Added
- Go to definition also opens Jinja templates (`jinja2` folders).

### Changed
- Template tag snippets use double quotes.
- Adjusted filter snippets to match Django usage.

## [1.10.0] - 2022-02-22

### Added
- `translate` and `blocktranslate` template tag snippets.

## [1.9.0] - 2022-02-09

### Fixed
- File associations for `django-html` and `django-txt`.
- Bracket matching in template files.

## [1.8.1] - 2022-02-08

### Changed
- Upgraded dependencies.

## [1.8.0] - 2021-11-28

### Added
- Automatic HTML indentation in templates (#5, #65, #86).

## [1.7.0] - 2021-11-28

### Added
- Support for VS Code for the Web.

## [1.6.0] - 2021-04-09

### Changed
- Python helper files are no longer included in the package.

## [1.5.0] - 2021-04-07

### Changed
- More development files excluded from the package (reverted in 1.6.0).

## [1.4.1] - 2021-04-07

### Changed
- Added sponsors to the README.

## [1.4.0] - 2021-03-21

### Fixed
- Syntax highlighting of the `id` attribute.

## [1.3.0] - 2021-01-30

### Removed
- `endcycle` and `enddebug` template tag snippets, which are not Django tags.

## [1.2.0] - 2021-01-20

### Added
- `JSONField` snippets (new in Django 3.1).

## [1.1.0] - 2021-01-20

### Changed
- More template tag snippets insert their block on a single line.

## [1.0.3] - 2021-01-08

### Fixed
- README formatting.

## [1.0.2] - 2021-01-08

### Removed
- The contribution notification added in 1.0.1.

## [1.0.1] - 2020-12-11

### Added
- Notification inviting users to contribute.

## [1.0.0] - 2020-10-28

### Changed
- Upgraded dependencies.
- README recommends the gettext extension for `.po` files.

## [0.20.0] - 2020-02-25

### Fixed
- Template tag syntax highlighting.

## [0.19.0] - 2019-02-11

### Added
- Go to template definition from Python views.

## [0.18.0] - 2019-02-11

### Changed
- Upgraded dependencies.

### Fixed
- Model form class snippet syntax (#29).

## [0.17.0] - 2018-07-27

### Changed
- Quality pass on template tag snippets.

## [0.16.0] - 2018-07-23

### Changed
- Template grammars are generated from TOML sources, with several syntax fixes.

## [0.15.0] - 2018-07-19

### Added
- Relative paths (`./`, `../`) in template go to definition.

## [0.14.1] - 2018-07-18

### Fixed
- Template go to definition.

## [0.14.0] - 2018-07-18

### Changed
- Improved template go to definition.

## [0.13.0] - 2018-07-17

### Added
- Migration snippets.

## [0.12.0] - 2018-07-15

### Added
- Settings: `django.snippets.use`, `django.snippets.exclude` and `django.i18n`.

## [0.11.0] - 2018-07-04

### Fixed
- View completions.

## [0.10.1] - 2018-07-03

### Changed
- Upgraded dependencies.

## [0.10.0] - 2018-07-02

### Added
- Python snippets scoped to the file type (models, views, forms, admin, urls…).

## [0.9.1] - 2018-06-21

### Changed
- Marketplace banner background.

## [0.9.0] - 2018-06-21

### Changed
- New logo and images.

## [0.8.0] - 2018-06-21

### Added
- Go to definition for templates in `extends` and `include` tags.

## [0.7.0] - 2018-06-19

### Changed
- Template snippets output mostly single quotes.

## [0.6.0] - 2018-06-19

### Changed
- Improved HTML template snippets.

## [0.5.0] - 2018-06-19

### Changed
- Snippets output double quotes.

## [0.4.0] - 2018-06-18

### Added
- Many more snippets (#3).

## [0.3.0] - 2018-06-11

### Added
- Template snippets.

### Changed
- Lowered the minimum VS Code version.

## [0.2.0] - 2018-06-10

### Fixed
- Early fixes.

## [0.1.0] - 2018-06-10

### Added
- Initial release: `django-html` and `django-txt` syntax highlighting.
