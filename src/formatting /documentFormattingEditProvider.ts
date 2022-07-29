import {formatter} from './formatter'

export class DjangoDocumentFormattingEditProvider {

    constructor () {
    }

    async provideDocumentFormattingEdits (document, options, token) {
        const otext = document.getText()
        if (!otext) { return; }
        let newDoc = document

        const text = formatter(newDoc, diagnosticCollection)

        if (text && text != otext) {
            const range = new Range(document.positionAt(0), document.positionAt(otext.length))
            return [new TextEdit(range, text)]
        } else {
            return []
        }
    }
}