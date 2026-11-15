'use strict'

import * as child_process from 'child_process'
import * as fs from 'fs'
import { delimiter, dirname, join } from 'path'
import {
    CancellationToken,
    DocumentFormattingEditProvider,
    ProviderResult,
    Range,
    TextDocument,
    TextEdit,
    window,
    workspace,
} from 'vscode'
import { DJANGO_HTML_SELECTOR } from '../constants'

// Runs the formatter set in django.format.command, like ["djlint", "-", "--reformat"].
// The template is sent on stdin and the formatted template is read from stdout.
export class TemplateFormattingProvider implements DocumentFormattingEditProvider {

    public selector = DJANGO_HTML_SELECTOR

    // child_process does not exist in VS Code for the Web
    public static isAvailable(): boolean {
        return typeof child_process.spawn === 'function'
    }

    public provideDocumentFormattingEdits(document: TextDocument, _options: unknown, token: CancellationToken): ProviderResult<TextEdit[]> {
        const command = workspace.getConfiguration('django', document).get<string[]>('format.command', [])
        if (!command.length) return []

        const text = document.getText()
        return run(command, text, cwd(document), token).then(formatted => {
            if (formatted === null || formatted === text) return []
            return [new TextEdit(new Range(document.positionAt(0), document.positionAt(text.length)), formatted)]
        })
    }
}

function cwd(document: TextDocument): string {
    const folder = workspace.getWorkspaceFolder(document.uri)
    return folder ? folder.uri.fsPath : dirname(document.uri.fsPath)
}

// Finds the tools installed in the project virtual environment first
function env(cwd: string): NodeJS.ProcessEnv {
    const bin = join(cwd, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin')
    if (!fs.existsSync(bin)) return process.env
    return { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH ?? ''}` }
}

function run(command: string[], input: string, cwd: string, token: CancellationToken): Promise<string | null> {
    const [program, ...args] = command
    return new Promise(resolve => {
        const child = child_process.spawn(program, args, { cwd, env: env(cwd) })
        let stdout = ''
        let stderr = ''
        child.stdout.setEncoding('utf8').on('data', chunk => stdout += chunk)
        child.stderr.setEncoding('utf8').on('data', chunk => stderr += chunk)
        token.onCancellationRequested(() => child.kill())

        child.on('error', error => {
            const reason = (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'not found' : error.message
            window.showErrorMessage(`Django: cannot format with ${program}: ${reason}. Check django.format.command.`)
            resolve(null)
        })
        child.on('close', code => {
            if (token.isCancellationRequested) return resolve(null)
            if (code !== 0) {
                window.showErrorMessage(`Django: ${program} failed (exit ${code}): ${stderr.trim().split('\n').pop()}`)
                return resolve(null)
            }
            // An empty output would wipe the template
            resolve(stdout || !input ? stdout : null)
        })
        child.stdin.on('error', () => undefined)
        child.stdin.end(input)
    })
}
