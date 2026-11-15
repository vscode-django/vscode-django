'use strict'

import { DocumentFilter } from 'vscode'

export const DJANGO_HTML_SELECTOR: DocumentFilter = { scheme: 'file', language: 'django-html' }
// Templates are plain HTML files in a templates (or jinja2) folder
export const HTML_TEMPLATE_SELECTOR: DocumentFilter = { scheme: 'file', language: 'html', pattern: '**/{templates,jinja2}/**' }
export const TEMPLATE_SELECTOR: DocumentFilter[] = [DJANGO_HTML_SELECTOR, HTML_TEMPLATE_SELECTOR]
export const PYTHON_SELECTOR: DocumentFilter = { scheme: 'file', language: 'python' }
