import * as vscode from "vscode";
import { Ri5devBrowserProvider } from "./Ri5devBrowser";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "robotinventor" is now active!');

  const ri5devBrowserProvider = new Ri5devBrowserProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "ri5devBrowser",
      ri5devBrowserProvider
    ),
    vscode.commands.registerCommand("ri5devBrowser.action.pickDevice", () => {
      vscode.window.showInformationMessage("Picking a device!");
    })
  );
}

export function deactivate() {}
