'use strict'

import * as fs from 'fs'
import { basename } from 'path'
import { Disposable, Position, Uri, workspace } from 'vscode'

export const EXCLUDE = '**/{node_modules,.venv,venv,.git}/**'
// The templatetags of the packages installed in the virtual environment are indexed too
const PACKAGES_EXCLUDE = '**/{node_modules,.git}/**'
const PACKAGES_RE = /\/(?:site|dist)-packages\//

// A function and its decorators, which can be stacked: @register.tag("translate") @register.tag("trans") def do_translate
const DECORATED_RE = /((?:^[ \t]*@(?:[^()\n]|\((?:[^()]|\([^()]*\))*\))*\n)+)[ \t]*(?:async[ \t]+)?def[ \t]+(\w+)/gm
// @register.tag("custom_tag"), @register.simple_tag(name="x"), @register.inclusion_tag("x.html")
const REGISTER_RE = /@register\.(simple_tag|simple_block_tag|inclusion_tag|tag)\b(?:\(((?:[^()]|\([^()]*\))*)\))?/g

// Django's tags that are always loaded, and the folders of its other tag libraries, like i18n
const DJANGO_BUILTINS = ['defaulttags', 'loader_tags']
const DJANGO_FILES = [
    '**/django/template/{defaulttags,loader_tags}.py',
    '**/django/templatetags/*.py',
    '**/django/contrib/*/templatetags/*.py',
]

export interface TagDefinition {
    library: string
    // Where the function is defined
    uri: Uri
    position: Position
    // A tag of Django itself, like {% if %}, found in the virtual environment
    django: boolean
    // A tag of a package installed in the virtual environment, like django_vite
    thirdParty: boolean
    // Available in every template, without {% load %}
    builtin: boolean
}

// A module of tags, like templatetags/myapp_tags.py, loaded with {% load myapp_tags %}
export interface TagLibrary {
    uri: Uri
    django: boolean
    thirdParty: boolean
}

export interface Tags {
    tags: Map<string, TagDefinition[]>
    libraries: Map<string, TagLibrary[]>
    // The version of the Django of the workspace, like 6.0, to link to its documentation
    djangoVersion?: string
}

// The tags and the tag libraries of the workspace: the templatetags modules of the project and,
// when the virtual environment is inside the workspace, the ones of Django and of the installed packages.
// It is built when first needed and again when a templatetags module changes.
export class TagIndex implements Disposable {

    private index: Promise<Tags> | undefined
    private watcher = workspace.createFileSystemWatcher('**/templatetags/**/*.py')

    constructor() {
        const reset = () => this.index = undefined
        this.watcher.onDidCreate(reset)
        this.watcher.onDidChange(reset)
        this.watcher.onDidDelete(reset)
    }

    public dispose(): void {
        this.watcher.dispose()
    }

    public get(): Promise<Tags> {
        return this.index ??= build()
    }
}

export const positionAt = (text: string, index: number): Position => {
    const lines = text.slice(0, index).split('\n')
    return new Position(lines.length - 1, lines[lines.length - 1].length)
}

// A position in the fragment of an URI, like file.py#L12,5
export const fragmentOf = (position: Position) => `L${position.line + 1},${position.character + 1}`

export const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const LOAD_RE = /{%-?\s*load\s+([^%]*?)\s*-?%}/g

// The libraries of {% load a b %} and {% load name from library %}, with their position in the arguments
export function libraryWords(args: string): { name: string, offset: number }[] {
    const from = /\sfrom\s+/.exec(args)
    const start = from ? from.index + from[0].length : 0
    return Array.from(args.slice(start).matchAll(/[\w.]+/g), word => ({ name: word[0], offset: start + word.index! }))
}

export function loadedLibraries(text: string): Set<string> {
    const libraries = new Set<string>()
    for (const match of text.matchAll(LOAD_RE)) {
        for (const { name } of libraryWords(match[1])) libraries.add(name)
    }
    return libraries
}

export interface RegisteredFunction {
    // The names of the tags it registers: one function can register several
    tags: string[]
    // Where the decorators and the name of the function start and end
    start: number
    name: number
    end: number
}

// The functions of a Python module that register template tags
export function registeredTags(text: string): RegisteredFunction[] {
    const functions: RegisteredFunction[] = []
    for (const decorated of text.matchAll(DECORATED_RE)) {
        const [source, decorators, functionName] = decorated
        const tags: string[] = []
        for (const [, kind, args = ''] of decorators.matchAll(REGISTER_RE)) {
            tags.push(args.match(/\bname\s*=\s*['"](\w+)['"]/)?.[1]
                ?? (kind === 'tag' ? args.match(/^\s*['"](\w+)['"]/)?.[1] : undefined)
                ?? functionName)
        }
        if (!tags.length) continue
        const end = decorated.index! + source.length
        functions.push({ tags, start: decorated.index!, name: end - functionName.length, end })
    }
    return functions
}

// The real path of a file: a virtual environment can have lib64 as a link to lib, and the same file
// would be found twice
async function canonical(uri: Uri): Promise<Uri> {
    // fs does not exist in VS Code for the Web
    if (uri.scheme !== 'file' || typeof fs.promises?.realpath !== 'function') return uri
    try {
        return Uri.file(await fs.promises.realpath(uri.fsPath))
    } catch {
        return uri
    }
}

async function build(): Promise<Tags> {
    const tags = new Map<string, TagDefinition[]>()
    const libraries = new Map<string, TagLibrary[]>()
    const seen = new Set<string>()
    const add = async (found: Uri, django: boolean) => {
        const uri = await canonical(found)
        if (seen.has(uri.toString())) return
        seen.add(uri.toString())
        const library = basename(uri.path, '.py')
        if (library === '__init__') return
        const thirdParty = !django && PACKAGES_RE.test(uri.path)
        libraries.set(library, [...libraries.get(library) ?? [], { uri, django, thirdParty }])
        const builtin = django && DJANGO_BUILTINS.includes(library)
        const text = await read(uri)
        for (const registered of registeredTags(text)) {
            const position = positionAt(text, registered.name)
            for (const name of registered.tags) {
                tags.set(name, [...tags.get(name) ?? [], { library, uri, position, django, thirdParty, builtin }])
            }
        }
    }

    // Django comes first: it is also found by the search of the other packages
    const django = await Promise.all(DJANGO_FILES.map(pattern => workspace.findFiles(pattern, PACKAGES_EXCLUDE)))
    for (const uri of django.flat()) await add(uri, true)
    // The project, then the packages of the virtual environment, like django_vite
    for (const uri of await workspace.findFiles('**/templatetags/**/*.py', EXCLUDE)) await add(uri, false)
    for (const uri of await workspace.findFiles('**/{site,dist}-packages/**/templatetags/**/*.py', PACKAGES_EXCLUDE)) await add(uri, false)

    // django/template/defaulttags.py: the version is in django/__init__.py
    const defaulttags = django.flat().find(uri => basename(uri.path) === 'defaulttags.py')
    let djangoVersion: string | undefined
    if (defaulttags) {
        try {
            const init = await read(Uri.joinPath(defaulttags, '..', '..', '__init__.py'))
            const version = /^VERSION\s*=\s*\((\d+),\s*(\d+)/m.exec(init)
            if (version) djangoVersion = `${version[1]}.${version[2]}`
        } catch {
            // Without the version, the documentation of the stable version is used
        }
    }
    return { tags, libraries, djangoVersion }
}

export async function read(uri: Uri): Promise<string> {
    return new TextDecoder('utf-8').decode(await workspace.fs.readFile(uri))
}

// The text of a file, with the changes that are not saved if it is open
export async function textOf(uri: Uri): Promise<string> {
    const open = workspace.textDocuments.find(document => document.uri.toString() === uri.toString())
    return open ? open.getText() : read(uri)
}
