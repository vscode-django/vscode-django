
import toml = require("toml");

import vscode = require("vscode");
import { TextDecoder } from "util";

export interface DjangoSnippet {
    prefix: string
    body: string
    detail: string
    description: string
}

export class SnippetProvider {
    constructor(private extensionUri: vscode.Uri) {
    }
    async readSnippets(name: string): Promise<DjangoSnippet[]> {

        const location = vscode.Uri.joinPath(this.extensionUri, 'completions/snippets', name)

        const buffer = await vscode.workspace.fs.readFile(location);
        const str = new TextDecoder("utf-8").decode(buffer);

        return toml.parse(str).snippets;
    }
}


export async function postInitHook(): Promise<void> { }
