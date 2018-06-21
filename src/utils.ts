
import path = require("path");
import fs = require('fs');
import toml = require('toml');
const folder = path.resolve(__dirname, '../completions/snippets/');

export function readSnippets(id: string) {
    return toml.parse(fs.readFileSync(path.resolve(folder, id), 'utf-8')).snippets
}