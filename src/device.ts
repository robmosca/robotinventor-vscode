import * as vscode from "vscode";
import * as SerialPort from "serialport";
import { existsSync } from "fs";
import { EventEmitter } from "events";
import { decodeBase64, randomId } from "./utils";

const PROMPT = "\r\n>>> ";

enum DeviceMode {
  REPL,
  API,
}

type StorageInfo = {
  available: number;
  total: number;
  pct: number;
  unit: string;
  free: number;
};

type SlotInfo = {
  name: string;
  id: number;
  project_id: string;
  modified: Date;
  type: string;
  created: Date;
  size: number;
};

type StorageStatus = {
  storage: StorageInfo;
  slots: SlotInfo[];
};

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
  public devMode: DeviceMode;
  public storageStatus: StorageStatus | undefined;

  constructor(ttyDevice: string) {
    super();
    this.ttyDevice = ttyDevice;
    this.name = ttyDevice;
    this.firmwareVersion = "";
    this.serialPort = undefined;
    this.devMode = DeviceMode.API;
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
          this.devMode = DeviceMode.REPL;
          resolve();
        }
      };
      this.serialPort?.on("data", dataHandler);
      this.serialPort?.write("\x03");
    });
  }

  private async exitREPL() {
    return new Promise((resolve, reject) => {
      if (this.devMode !== DeviceMode.REPL) {
        return resolve();
      }

      const processData = (data: Buffer) => {
        const stringData = data.toString();
        if (stringData.startsWith('{"m":0')) {
          this.serialPort?.removeListener("data", processData);
          resolve();
        }
      };

      this.serialPort?.on("data", processData);
      this.serialPort?.write("\x04");
      this.serialPort?.flush();
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
        const stringData = data.toString();
        if (stringData.endsWith(PROMPT)) {
          this.serialPort?.removeListener("data", processData);
          output += removeSuffix(stringData, PROMPT);
          output = removePrefix(output, cmd);
          output = removePrefix(output, "... \r\n");
          if (output.toLowerCase().trim().startsWith("traceback")) {
            reject(new Error(output));
          } else {
            resolve(output);
          }
        } else {
          output += stringData;
        }
      };

      this.serialPort?.on("data", processData);
      this.serialPort?.write(Buffer.from(`${cmd}\r\n`));
      this.serialPort?.flush();
    });
  }

  private async APIRequest(
    cmd: string,
    params: object
  ): Promise<StorageStatus> {
    this.assertDeviceInitialized();
    await this.exitREPL();

    return new Promise((resolve, reject) => {
      let response = "";
      const id = randomId();

      const processResponse = (data: Buffer) => {
        const stringData = data.toString();
        const crPos = stringData.indexOf("\r");
        if (crPos !== -1) {
          const lines = stringData.split("\r");
          for (let i = 0; i < lines.length - 1; ++i) {
            response += lines[i];
            try {
              const data = JSON.parse(response);
              if (data.i === id) {
                this.serialPort?.removeListener("data", processResponse);
                if (data.e) {
                  reject(new Error(JSON.parse(decodeBase64(data.e))));
                }
                resolve(data.r);
              }
            } catch (err) {
              this.serialPort?.removeListener("data", processResponse);
              reject(err);
            }
            response = lines[lines.length - 1];
          }
        } else {
          response += stringData;
        }
      };

      const msg = { m: cmd, p: params, i: id };
      const serializedMgs = JSON.stringify(msg);
      this.serialPort?.on("data", processResponse);
      this.serialPort?.write(Buffer.from(`${serializedMgs}\r`));
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
    try {
      const response = await this.execPythonCmd(
        "with open('local_name.txt') as f: print(f.read())\r\n"
      );
      this.name = response;
    } catch (err) {
      this.name = "LEGO Hub";
    }
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

  public async readPrograms() {
    this.storageStatus = await this.APIRequest("get_storage_status", {});
  }
}
