import * as vscode from "vscode";
import * as SerialPort from "serialport";
import { existsSync } from "fs";

export async function askDeviceFromList(manualEntry: string) {
  return new Promise<string | undefined>(async (resolve, reject) => {
    try {
      const serialPorts = await SerialPort.list();
      // using this promise in the quick-pick will cause a progress
      // bar to show if there are no items.
      const list = serialPorts
        .filter(
          (port) => port.manufacturer === "LEGO System A/S"
          // Connection through Bluetooth is not working reliably at the moment
          //  ||
          // port.path.startsWith("/dev/tty.LEGOHub")
        )
        .map((port) => port.path);

      list.push(manualEntry);
      const selected = await vscode.window.showQuickPick(list, {
        ignoreFocusOut: true,
        placeHolder:
          "Searching for devices... Select a device or press ESC to cancel",
      });
      resolve(selected);
    } catch (err) {
      reject(err);
    }
  });
}

export async function askDeviceName() {
  const name = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    prompt: "Enter the name for the TTY device",
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
