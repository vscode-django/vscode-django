'use strict'

import { Location, Range, Uri, workspace } from 'vscode'
import { escapeRegExp, EXCLUDE, positionAt, textOf } from './tagIndex'

const EXTENDS_RE = /{%-?\s*extends\s+(['"])([^'"]+)\1/
// {% block name %}, {% endblock %} and {{ block.super }}, in the order of the template
const BLOCK_RE = /{%-?\s*(?:block\s+(\w+)|(endblock))\b[^%]*%}|{{-?\s*block\.super\s*-?}}/g
const MAX_DEPTH = 20

export interface BlockSuper {
    // The block it is in
    block: string
    // The start and the length of "block.super"
    start: number
    length: number
}

// The {{ block.super }} of a template, with the block that contains each of them
export function blockSupers(text: string): BlockSuper[] {
    const supers: BlockSuper[] = []
    const open: string[] = []
    for (const match of text.matchAll(BLOCK_RE)) {
        if (match[1]) {
            open.push(match[1])
        } else if (match[2]) {
            open.pop()
        } else if (open.length) {
            const start = match.index! + match[0].indexOf('block.super')
            supers.push({ block: open[open.length - 1], start, length: 'block.super'.length })
        }
    }
    return supers
}

// The template that {% extends "path" %} points to
async function findTemplate(path: string, from: Uri): Promise<Uri | undefined> {
    if (path.startsWith('./') || path.startsWith('../')) {
        const uri = Uri.joinPath(from, '..', path)
        try {
            await workspace.fs.stat(uri)
            return uri
        } catch {
            return undefined
        }
    }
    const search = `**/{templates,jinja2}/${path}`
    // The templates of the project come before the ones of the packages, like admin/base.html
    return (await workspace.findFiles(search, EXCLUDE, 1))[0] ?? (await workspace.findFiles(search, '', 1))[0]
}

// {{ block.super }} renders the block of the parent template. This looks for the first parent, from the
// closest to the farthest, that defines the block: not every template of the chain overrides it.
export async function findParentBlock(uri: Uri, text: string, block: string): Promise<Location | undefined> {
    const blockRe = new RegExp(`{%-?\\s*block\\s+(${escapeRegExp(block)})(?!\\w)`)
    const seen = new Set<string>()
    while (seen.size < MAX_DEPTH && !seen.has(uri.toString())) {
        seen.add(uri.toString())
        const extend = EXTENDS_RE.exec(text)
        if (!extend) return undefined
        const parent = await findTemplate(extend[2], uri)
        if (!parent) return undefined
        uri = parent
        text = await textOf(parent)
        const match = blockRe.exec(text)
        if (match) {
            const start = positionAt(text, match.index + match[0].length - block.length)
            return new Location(parent, new Range(start, start.translate(0, block.length)))
        }
    }
    return undefined
}
