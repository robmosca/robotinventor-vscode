import * as vscode from "vscode";
import { Device } from "./device";
import { askSlotFromList, SlotType } from "./helpers/askSlot";
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
  const regCommandStopProgram = vscode.commands.registerCommand(
    "ri5devBrowser.stopProgram",
    stopProgram
  );
  const regCommandMoveProgram = vscode.commands.registerCommand(
    "ri5devBrowser.moveProgram",
    moveProgram
  );
  const regCommandRemoveProgram = vscode.commands.registerCommand(
    "ri5devBrowser.removeProgram",
    removeProgram
  );
  context.subscriptions.push(
    regRi5devBrowserProvider,
    regCommandPickDevice,
    regCommandRunProgram,
    regCommandStopProgram,
    regCommandMoveProgram,
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

async function askDeviceSlot(type: SlotType = "all") {
  if (!device) {
    throw new Error("No LEGO Hub connected, first connect the Hub...");
  }
  return await askSlotFromList(device, type);
}

async function execDeviceMethodOnSlot(
  functionName: string,
  slot?: ProgramSlotTreeItem
) {
  if (!slot) {
    slot = await askDeviceSlot();
    if (!slot) {
      return;
    }
  }
  console.log(
    `Executing ${functionName} ${slot.tooltip} (Slot ${slot.index})...`
  );

  if (device) {
    await (device as { [method: string]: any })[functionName](slot.index);
  }
}

async function runProgram(slot?: ProgramSlotTreeItem) {
  execDeviceMethodOnSlot("runProgram", slot);
}

async function stopProgram() {
  await device?.stopProgram();
}

async function moveProgram(
  fromSlot?: ProgramSlotTreeItem,
  toSlot?: ProgramSlotTreeItem
) {
  if (!fromSlot) {
    fromSlot = await askDeviceSlot("full");
    if (!fromSlot) {
      return;
    }
  }
  if (!toSlot) {
    toSlot = await askDeviceSlot("all");
    if (!toSlot) {
      return;
    }
  }
  console.log(
    `Moving program ${fromSlot.tooltip} (Slot ${fromSlot.index}) to slot ${toSlot.index}...`
  );

  await device?.moveProgram(fromSlot.index, toSlot.index);
}

async function removeProgram(slot?: ProgramSlotTreeItem) {
  execDeviceMethodOnSlot("removeProgram", slot);
}

export function deactivate() {}
