import * as vscode from "vscode";

export interface GeneralObject {
  [index: string]: any;
}


export const extractAsKeyValue = (object: GeneralObject) => ({
  key: Object.keys(object)[0],
  value: Object.values(object)[0],
});


export const htmlSettings = [
  {
    "files.associations": {
      "**/*.html": "html",
      "**/templates/**/*.html": "django-html",
      "**/templates/**/*": "django-txt",
      "**/requirements{/**,*}.{txt,in}": "pip-requirements",
    },
  },
  {
    "emmet.includeLanguages": { "django-html": "html" },
  }
] as GeneralObject[];

const updateUserSettings = async (settings: GeneralObject[]) => {
  settings.forEach(async (setting) => {
    const { key, value } = extractAsKeyValue(setting);
    await vscode.workspace
      .getConfiguration()
      .update(key, value, vscode.ConfigurationTarget.Global);
  });
};

export async function activateHtmlPatchSettings(context: vscode.ExtensionContext) {
  const showDialog = vscode.window.showInformationMessage;
  let disposable = vscode.commands.registerCommand(
    "django.updateHtmlConfig",
    async () => {
      console.log(JSON.stringify(htmlSettings, null, 1));
      await updateUserSettings(htmlSettings);
      showDialog("Html files recognition in Django Projects has been updated.");
    }
  );
  context.subscriptions.push(disposable);
}
