
import path = require("path");
import fs = require('fs');
import toml = require('toml');
const folder = path.resolve(__dirname, '../completions/snippets/');


export interface DjangoSnippet {
    prefix: string
    body: string
    detail: string
    description: string
}


export function readSnippets(name: string): DjangoSnippet[] {
    return toml.parse(fs.readFileSync(path.resolve(folder, name), 'utf-8')).snippets
}