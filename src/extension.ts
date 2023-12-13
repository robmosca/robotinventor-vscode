import * as vscode from 'vscode';
import { ProgramSlotTreeItem, Ri5devBrowserProvider } from './Ri5devBrowser';
import {
  SlotType,
  connectDevice,
  disconnectDevice,
  getDeviceSlots,
  isDeviceConnected,
  moveProgramOnDevice,
  runProgramOnDevice,
  removeProgramFromDevice,
  stopProgramOnDevice,
  uploadProgramToDevice,
} from './device';
import { existsSync } from 'fs';
import { SerialPort } from 'serialport';
import { basename } from 'path';

const toastDuration = 5000;

let ri5devBrowserProvider: Ri5devBrowserProvider;

export function activate(
  context: vscode.ExtensionContext,
): void | Thenable<void> {
  console.log('Congratulations, your extension "robotinventor" is now active!');

  ri5devBrowserProvider = new Ri5devBrowserProvider();
  const regRi5devBrowserProvider = vscode.window.registerTreeDataProvider(
    'ri5devBrowser',
    ri5devBrowserProvider,
  );
  const regCommandconnectDevice = vscode.commands.registerCommand(
    'ri5devBrowser.action.connectDevice',
    connectDeviceCmd,
  );
  const regCommandDisconnectDevice = vscode.commands.registerCommand(
    'ri5devBrowser.action.disconnectDevice',
    disconnectDeviceCmd,
  );
  const regCommandRunProgram = vscode.commands.registerCommand(
    'ri5devBrowser.runProgram',
    runProgram,
  );
  const regCommandStopProgram = vscode.commands.registerCommand(
    'ri5devBrowser.stopProgram',
    stopProgramOnDevice,
  );
  const regCommandMoveProgram = vscode.commands.registerCommand(
    'ri5devBrowser.moveProgram',
    moveProgram,
  );
  const regCommandRemoveProgram = vscode.commands.registerCommand(
    'ri5devBrowser.removeProgram',
    removeProgram,
  );
  const regCommandUploadProgram = vscode.commands.registerCommand(
    'ri5devBrowser.uploadProgram',
    uploadProgram,
  );
  context.subscriptions.push(
    regRi5devBrowserProvider,
    regCommandconnectDevice,
    regCommandDisconnectDevice,
    regCommandRunProgram,
    regCommandStopProgram,
    regCommandMoveProgram,
    regCommandRemoveProgram,
    regCommandUploadProgram,
  );
}

export function deactivate(): void {}

async function askDeviceName() {
  const name = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    prompt: 'Enter the name for the TTY device',
    placeHolder: 'Example: "tty.usbmodem3377397C33381"',
    validateInput: (value: string) => {
      const devicePath = `/dev/${value}`;
      if (value && !existsSync(devicePath)) {
        return `${devicePath} does not seem to exist, is it correct? 🤔`;
      } else {
        return null;
      }
    },
  });
  if (!name) {
    // cancelled
    return undefined;
  }
  return `/dev/${name}`;
}

async function askDeviceFromList(manualEntry: string) {
  const serialPorts = await SerialPort.list();
  // using this promise in the quick-pick will cause a progress
  // bar to show if there are no items.
  const list = serialPorts
    .filter((port) => port.manufacturer === 'LEGO System A/S')
    .map((port) => port.path);

  list.push(manualEntry);
  const selected = await vscode.window.showQuickPick(list, {
    ignoreFocusOut: true,
    placeHolder:
      'Searching for devices... Select a device or press ESC to cancel',
  });
  return selected;
}

async function selectDeviceName() {
  const manualEntry = "I don't see my device...";
  const selectedItem = await askDeviceFromList(manualEntry);

  return selectedItem === manualEntry ? askDeviceName() : selectedItem;
}

export function showTemporaryStatusBarMessage(message: string): void {
  vscode.window.setStatusBarMessage(message, toastDuration);
}

async function connectDeviceCmd(): Promise<void> {
  const deviceName = await selectDeviceName();
  if (!deviceName) {
    // user canceled
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: 'Connecting...',
    },
    async () => {
      try {
        await connectDevice(deviceName);
        ri5devBrowserProvider.refreshDevice();
        showTemporaryStatusBarMessage(`Connected`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : err;
        vscode.window.showErrorMessage(
          `Failed to connect to ${deviceName}: ${msg}`,
        );
        ri5devBrowserProvider.clearDevice();
      }
    },
  );
}

function assertDeviceConnected() {
  if (!isDeviceConnected()) {
    vscode.window.showErrorMessage(
      'No LEGO Hub connected, first connect the Hub...',
    );
    return false;
  }
  return true;
}

async function disconnectDeviceCmd() {
  if (assertDeviceConnected()) {
    await disconnectDevice();
    if (isDeviceConnected()) {
      vscode.window.showErrorMessage('Failed to disconnect from device');
    } else {
      ri5devBrowserProvider.clearDevice();
    }
  }
}

async function askSlotAndExecuteMethod(
  functionName: string,
  slot?: ProgramSlotTreeItem,
) {
  if (!slot) {
    slot = await askDeviceSlot();
    if (!slot) {
      return;
    }
  }
  console.log(
    `Executing ${functionName} ${slot.tooltip} (Slot ${slot.index})...`,
  );

  switch (functionName) {
    case 'runProgram':
      return runProgramOnDevice(slot.index);
    case 'removeProgram':
      return removeProgramFromDevice(slot.index);
    default:
      return;
  }
}

async function runProgram(slot: ProgramSlotTreeItem) {
  askSlotAndExecuteMethod('runProgram', slot);
}

async function askSlotFromList(slotType: SlotType) {
  const slots = getDeviceSlots();
  if (slots === undefined) {
    throw new Error(
      'Device storage info not loaded... Please, reconnect your device',
    );
  }

  const list = [...Array(20).keys()]
    .filter((i) => {
      if (slotType === 'all') {
        return true;
      } else if (slotType === 'full') {
        return slots[i];
      } else {
        return !slots[i];
      }
    })
    .map((i) => {
      const slotTreeItem = new ProgramSlotTreeItem(i, slots[i]);
      return slotTreeItem.label! as string;
    });
  const selected = await vscode.window.showQuickPick(list, {
    ignoreFocusOut: true,
    placeHolder: 'Select a slot or press ESC to cancel',
  });

  if (selected) {
    const index = parseInt(selected.split('.')[0]);
    return new ProgramSlotTreeItem(index, slots[index]);
  }

  return undefined;
}

async function askDeviceSlot(type: SlotType = 'all') {
  if (!assertDeviceConnected()) {
    return;
  }
  return await askSlotFromList(type);
}

async function moveProgram(
  fromSlot?: ProgramSlotTreeItem,
  toSlot?: ProgramSlotTreeItem,
) {
  if (!assertDeviceConnected()) {
    return;
  }
  if (!fromSlot) {
    fromSlot = await askDeviceSlot('full');
    if (!fromSlot) {
      return;
    }
  }
  if (!toSlot) {
    toSlot = await askDeviceSlot('all');
    if (!toSlot) {
      return;
    }
  }
  console.log(
    `Moving program ${fromSlot.tooltip} (Slot ${fromSlot.index}) to slot ${toSlot.index}...`,
  );

  return moveProgramOnDevice(fromSlot.index, toSlot.index);
}

async function removeProgram(slot?: ProgramSlotTreeItem) {
  askSlotAndExecuteMethod('removeProgram', slot);
}

async function uploadProgram(slot?: ProgramSlotTreeItem) {
  if (!isDeviceConnected()) {
    return;
  }
  const editor = vscode.window.activeTextEditor;
  const filename = editor?.document.fileName;
  if (!filename || !filename.endsWith('.py')) {
    vscode.window.showErrorMessage('You first need to open a micropython file');
    return;
  }
  if (!slot) {
    slot = await askDeviceSlot('all');
    if (!slot) {
      return;
    }
  }
  console.log(`Uploading program ${filename} to slot ${slot.index}...`);

  const prgName = basename(filename, '.py');
  const prgText = editor!.document.getText();
  return uploadProgramToDevice(prgName, prgText, slot.index);
}
