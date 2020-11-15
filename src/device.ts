import * as vscode from "vscode";
import * as SerialPort from "serialport";
import { existsSync } from "fs";
import { EventEmitter } from "events";

const PROMPT = "\r\n>>> ";

async function askDeviceFromList(manualEntry: string) {
  return new Promise<string>(async (resolve, reject) => {
    const serialPorts = await SerialPort.list();
    // using this promise in the quick-pick will cause a progress
    // bar to show if there are no items.
    const list = serialPorts
      .filter(
        (port) =>
          port.manufacturer === "LEGO System A/S" ||
          port.path.startsWith("/dev/tty.LEGOHub")
      )
      .map((port) => port.path);

    list.push(manualEntry);
    const selected = await vscode.window.showQuickPick(list, {
      ignoreFocusOut: true,
      placeHolder:
        "Searching for devices... Select a device or press ESC to cancel.",
    });
    resolve(selected);
  });
}

async function askDeviceName() {
  const name = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    prompt: "Enter the name for the TTY device",
    placeHolder: 'Example: "LEGOHub380B3CAEB5B6-Ser (Bluetooth)"',
    validateInput: (value: string) => {
      const devicePath = `/dev/tty.${value}`;
      if (!existsSync(devicePath)) {
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
  return `/dev/tty.${name}`;
}

export class Device extends EventEmitter {
  public ttyDevice: string;
  public name: string;
  public firmwareVersion: string;
  public serialPort: SerialPort | undefined;

  constructor(ttyDevice: string) {
    super();
    this.ttyDevice = ttyDevice;
    this.name = ttyDevice;
    this.firmwareVersion = "";
    this.serialPort = undefined;
  }

  private assertDeviceInitialized() {
    if (!this.serialPort) {
      throw new Error("Device not initialized");
    }
  }

  private async getPrompt() {
    return new Promise((resolve, reject) => {
      this.assertDeviceInitialized();
      const dataHandler = (data: Buffer) => {
        if (data.toString().endsWith(PROMPT)) {
          this.serialPort?.removeListener("data", dataHandler);
          resolve();
        }
      };
      this.serialPort?.on("data", dataHandler);
      this.serialPort?.write("\x03");
    });
  }

  private async execPythonCmd(cmd: string): Promise<string> {
    const removePrefix = (str: string, prefix: string) =>
      str.startsWith(prefix) ? str.substring(prefix.length) : str;
    const removeSuffix = (str: string, prefix: string) =>
      str.endsWith(prefix) ? str.substring(0, str.length - prefix.length) : str;

    return new Promise((resolve, reject) => {
      this.assertDeviceInitialized();

      let output = "";

      const processData = (data: Buffer) => {
        let stringData = data.toString();
        if (stringData.endsWith(PROMPT)) {
          this.serialPort?.removeListener("data", processData);
          output += removeSuffix(stringData, PROMPT);
          output = removePrefix(output, cmd);
          output = removePrefix(output, "... \r\n");
          resolve(output);
        } else {
          output += stringData;
        }
      };

      this.serialPort?.on("data", processData);
      this.serialPort?.write(Buffer.from(`${cmd}\r\n`));
      this.serialPort?.flush();
    });
  }

  static async selectDevice() {
    const manualEntry = "I don't see my device...";
    const selectedItem = await askDeviceFromList(manualEntry);

    if (selectedItem === manualEntry) {
      const deviceName = await askDeviceName();
      return deviceName ? new Device(deviceName) : undefined;
    }

    return selectedItem ? new Device(selectedItem) : undefined;
  }

  public async readNameFromDevice() {
    const response = await this.execPythonCmd(
      "with open('local_name.txt') as f: print(f.read())\r\n"
    );
    this.name = response;
    this.emit("change");
  }

  public connect() {
    return new Promise((resolve, reject) => {
      this.serialPort = new SerialPort(
        this.ttyDevice,
        {
          baudRate: 115200,
        },
        async (err) => {
          if (err) {
            reject(err);
          } else {
            await this.getPrompt();
            await this.readNameFromDevice();
            resolve();
          }
        }
      );
    });
  }
}
