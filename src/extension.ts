import * as vscode from "vscode";
import { Device } from "./device";
import { Ri5devBrowserProvider } from "./Ri5devBrowser";
import { showTemporaryStatusBarMessage } from "./utils";

let ri5devBrowserProvider: Ri5devBrowserProvider;

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "robotinventor" is now active!');

  ri5devBrowserProvider = new Ri5devBrowserProvider();
  const regRi5devBrowserProvider = vscode.window.registerTreeDataProvider(
    "ri5devBrowser",
    ri5devBrowserProvider
  );
  const regCommandPickDevice = vscode.commands.registerCommand(
    "ri5devBrowser.action.pickDevice",
    () => pickDevice()
  );
  context.subscriptions.push(regRi5devBrowserProvider, regCommandPickDevice);
}

async function pickDevice(): Promise<void> {
  const device = await Device.selectDevice();
  if (!device) {
    // user canceled
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: "Connecting...",
    },
    async () => {
      ri5devBrowserProvider.setDevice(device);
      try {
        await device.connect();
        showTemporaryStatusBarMessage(`Connected`);
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to connect to ${device.name}: ${err.message}`
        );
      }
    }
  );
}

export function deactivate() {}
