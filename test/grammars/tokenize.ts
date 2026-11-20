import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { loadWASM, OnigScanner, OnigString } from 'vscode-oniguruma'
import { INITIAL, IGrammar, parseRawGrammar, Registry } from 'vscode-textmate'

const require = createRequire(import.meta.url)
const root = join(__dirname, '../..')
const thirdParty = (name: string) => require.resolve(`tm-grammars/grammars/${name}.json`)

// The grammars VS Code ships, plus ours, by scope name
const GRAMMARS: Record<string, string> = {
    'text.html.derivative': thirdParty('html-derivative'),
    'text.html.basic': thirdParty('html'),
    'source.css': thirdParty('css'),
    'source.js': thirdParty('javascript'),
    'text.html.django': join(root, 'syntaxes/django-html.tmLanguage.json'),
    'text.django': join(root, 'syntaxes/django-txt.tmLanguage.json'),
}

const package_json = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
type Contribution = { scopeName: string, path: string, injectTo?: string[] }
const contributions: Contribution[] = package_json.contributes.grammars
for (const { scopeName, path } of contributions) GRAMMARS[scopeName] = join(root, path)

let registry: Registry | undefined

async function getRegistry(): Promise<Registry> {
    if (registry) return registry
    await loadWASM(readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')).buffer)
    registry = new Registry({
        onigLib: Promise.resolve({
            createOnigScanner: (patterns: string[]) => new OnigScanner(patterns),
            createOnigString: (text: string) => new OnigString(text),
        }),
        loadGrammar: async scopeName => {
            const path = GRAMMARS[scopeName]
            return path ? parseRawGrammar(readFileSync(path, 'utf8'), path) : null
        },
        // Injections contributed in package.json, like VS Code does
        getInjections: scopeName => contributions
            .filter(grammar => grammar.injectTo?.includes(scopeName))
            .map(grammar => grammar.scopeName),
    })
    return registry
}

export interface Token {
    text: string
    scopes: string[]
}

export async function tokenize(scopeName: string, source: string): Promise<Token[]> {
    const grammar: IGrammar | null = await (await getRegistry()).loadGrammar(scopeName)
    if (!grammar) throw new Error(`Unknown grammar ${scopeName}`)
    const tokens: Token[] = []
    let stack = INITIAL
    for (const line of source.split('\n')) {
        const result = grammar.tokenizeLine(line, stack)
        for (const token of result.tokens) {
            tokens.push({ text: line.slice(token.startIndex, token.endIndex), scopes: token.scopes })
        }
        stack = result.ruleStack
    }
    return tokens
}

// The scopes of the first token whose text is exactly `text`
export function scopesOf(tokens: Token[], text: string): string[] {
    const token = tokens.find(token => token.text === text)
    if (!token) throw new Error(`No token "${text}" in ${JSON.stringify(tokens.map(token => token.text))}`)
    return token.scopes
}
