'use strict'

import {
    DefinitionProvider,
    Location,
    Position,
    TextDocument,
} from 'vscode'
import { TEMPLATE_SELECTOR } from '../constants'
import { libraryWords, loadedLibraries, TagDefinition, TagIndex } from './tagIndex'

const LOAD_RE = /{%-?\s*load\s+/g
const TAG_NAME_RE = /{%-?\s*(\w+)\b/g
const BEGIN_OF_FILE = new Position(0, 0)

// Go to definition (F12) in a template:
// - on the name of a tag, like custom_tag or if: the function that registers it, in the templatetags
//   module of the project, or in the source of Django when the virtual environment is in the workspace,
// - on a library of {% load myapp_tags i18n %} or {% load trans from i18n %}: the templatetags module.
export class TagDefinitionProvider implements DefinitionProvider {

    public selector = TEMPLATE_SELECTOR

    constructor(private index: TagIndex) { }

    public async provideDefinition(document: TextDocument, position: Position): Promise<Location[] | null> {
        const line = document.lineAt(position.line).text
        const over = (start: number, length: number) => position.character >= start && position.character <= start + length

        for (const tag of line.matchAll(LOAD_RE)) {
            const argsStart = tag.index! + tag[0].length
            const end = line.indexOf('%}', argsStart)
            const args = line.slice(argsStart, end < 0 ? undefined : end)
            for (const { name, offset } of libraryWords(args)) {
                if (!over(argsStart + offset, name.length)) continue
                const libraries = (await this.index.get()).libraries.get(name)
                // The modules of the project come before the ones of Django
                return libraries
                    ?.sort((a, b) => Number(a.django) - Number(b.django))
                    .map(library => new Location(library.uri, BEGIN_OF_FILE)) ?? null
            }
        }

        for (const tag of line.matchAll(TAG_NAME_RE)) {
            const name = tag[1]
            if (!over(tag.index! + tag[0].length - name.length, name.length)) continue
            const { tags } = await this.index.get()
            const loaded = loadedLibraries(document.getText())
            // The tags the template loads come first, then the tags of the project, then the ones of Django.
            // The tags of the packages that the template does not load are left out
            const available = (def: TagDefinition) => def.builtin || loaded.has(def.library)
            const rank = (def: TagDefinition) => (available(def) ? 0 : 2) + (def.django ? 1 : 0)
            return tags.get(name)
                ?.filter(def => !def.thirdParty || available(def))
                .sort((a, b) => rank(a) - rank(b))
                .map(def => new Location(def.uri, def.position)) ?? null
        }
        return null
    }
}
