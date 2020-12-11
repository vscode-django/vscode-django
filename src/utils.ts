
import path = require("path");
import fs = require("fs");
import open = require("open");
import toml = require("toml");
import { window, workspace } from "vscode";

const folder = path.resolve(__dirname, "../completions/snippets/");

const settings = workspace.getConfiguration("django");

export interface DjangoSnippet {
    prefix: string
    body: string
    detail: string
    description: string
}


export function readSnippets(name: string): DjangoSnippet[] {
    return toml.parse(fs.readFileSync(path.resolve(folder, name), "utf-8")).snippets
}

export async function postInitHook(): Promise<void> {
    // Show for 20% of the ext. activation, sometime during the next hour
    if (settings.showContributeNotification && Math.random() > 0.8) {
        setTimeout(async () => {
            await notification()
        }, Math.random() * 3600000);
    }
}

async function notification() {
    const [REVIEW, SPONSOR, PAYPAL, NOPE] = ["Review it", "Sponsor on Github", "Paypal.me", "Nope"];

    let result = await window.showInformationMessage(
        "Do you like the Django extension? ✅  "+
        "How about giving some time to write a review? " +
        "Or become a Sponsor on Github to help me develop the Language Server for templates?" +
        "Maybe just a coffee? ☕",
        { "title": REVIEW }, { "title": SPONSOR }, { "title": PAYPAL }, { "title": NOPE },
    )

    if (!result) return;

    switch (result.title) {
        case (REVIEW):
            await open("https://marketplace.visualstudio.com/items?itemName=batisteo.vscode-django&ssr=false#review-details");
            break;

        case (SPONSOR):
            await open("https://github.com/sponsors/batisteo/");
            break;

        case (PAYPAL):
            await open("https://www.paypal.com/paypalme/batisteo/5");
            break;

        case (NOPE):
            break;
    };

    settings.update("showInformationMessage", false);
};