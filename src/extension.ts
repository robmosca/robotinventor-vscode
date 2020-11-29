import * as vscode from "vscode";
import { Device } from "./device";
import { ProgramSlotTreeItem, Ri5devBrowserProvider } from "./Ri5devBrowser";
import { showTemporaryStatusBarMessage } from "./utils";

let device: Device | undefined = undefined;
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
    pickDevice
  );
  const regCommandRunProgram = vscode.commands.registerCommand(
    "ri5devBrowser.runProgram",
    runProgram
  );
  const regCommandRemoveProgram = vscode.commands.registerCommand(
    "ri5devBrowser.removeProgram",
    removeProgram
  );
  context.subscriptions.push(
    regRi5devBrowserProvider,
    regCommandPickDevice,
    regCommandRunProgram,
    regCommandRemoveProgram
  );
}

async function pickDevice(): Promise<void> {
  device = await Device.selectDevice();
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
      if (!device) {
        return;
      }

      ri5devBrowserProvider.setDevice(device);
      try {
        await device.connect();
        await device.retrieveStorageStatus();
        showTemporaryStatusBarMessage(`Connected`);
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to connect to ${device.name}: ${err.message}`
        );
        ri5devBrowserProvider.clearDevice();
      }
    }
  );
}

async function runProgram(slot: ProgramSlotTreeItem) {
  console.log(`Executing program ${slot.label} (Slot ${slot.index})...`);
  await device?.runProgram(slot.index);
}

async function removeProgram(slot: ProgramSlotTreeItem) {
  console.log(`Removing program ${slot.tooltip} from slot ${slot.index}...`);
  await device?.removeProgram(slot.index);
}

export function deactivate() {}
