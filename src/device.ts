import { SerialPort } from 'serialport';
import { EventEmitter } from 'events';
import { APIRequest } from './api';
import { encodeBase64 } from './utils';

export type SlotType = 'all' | 'empty' | 'full';

const PROMPT = '\r\n>>> ';

export enum DeviceMode {
  REPL,
  API,
}

export type StorageInfo = {
  available: number;
  total: number;
  pct: number;
  unit: string;
  free: number;
};

export type SlotInfo = {
  name: string;
  id: number;
  project_id: string;
  modified: Date;
  type: 'python' | 'scratch';
  created: Date;
  size: number;
};

type SlotsInfo = {
  [index: number]: SlotInfo;
};

export type StorageStatus = {
  storage: StorageInfo;
  slots: SlotsInfo;
};

function checkSlotId(slotId: number) {
  if (slotId < 0 || slotId > 19) {
    throw new Error(`Invalid program slot index ${slotId}, valid slots: 0-19`);
  }
}

class Device extends EventEmitter {
  public ttyDevice: string;
  public name: string;
  public firmwareVersion: string;
  public serialPort: SerialPort | undefined;
  public devMode: DeviceMode;
  public storageStatus: StorageStatus | undefined;

  constructor(ttyDevice: string) {
    super();
    this.devMode = DeviceMode.API;
    this.firmwareVersion = '';
    this.name = 'LEGO Hub';
    this.name = ttyDevice;
    this.serialPort = undefined;
    this.ttyDevice = ttyDevice;
  }

  private assertDeviceInitialized() {
    if (!this.serialPort) {
      throw new Error('Device not initialized');
    }
  }

  private async obtainPrompt() {
    return new Promise<void>((resolve) => {
      this.assertDeviceInitialized();
      const dataHandler = (data: Buffer) => {
        if (data.toString().endsWith(PROMPT)) {
          this.serialPort?.removeListener('data', dataHandler);
          this.devMode = DeviceMode.REPL;
          resolve();
        }
      };
      this.serialPort?.on('data', dataHandler);
      this.serialPort?.write('\x03');
    });
  }

  private async execPythonCmd(cmd: string): Promise<string> {
    const removePrefix = (str: string, prefix: string) =>
      str.startsWith(prefix) ? str.substring(prefix.length) : str;
    const removeSuffix = (str: string, prefix: string) =>
      str.endsWith(prefix) ? str.substring(0, str.length - prefix.length) : str;

    if (this.devMode !== DeviceMode.REPL) {
      await this.obtainPrompt();
    }

    return new Promise((resolve, reject) => {
      this.assertDeviceInitialized();

      let output = '';

      const processData = (data: Buffer) => {
        const stringData = data.toString();
        if (stringData.endsWith(PROMPT)) {
          this.serialPort?.removeListener('data', processData);
          output += removeSuffix(stringData, PROMPT);
          output = removePrefix(output, cmd);
          output = removePrefix(output, '... \r\n');
          if (output.toLowerCase().trim().startsWith('traceback')) {
            reject(new Error(output));
          } else {
            resolve(output);
          }
        } else {
          output += stringData;
        }
      };

      this.serialPort?.on('data', processData);
      this.serialPort?.write(Buffer.from(`${cmd}\r\n`));
      this.serialPort?.flush();
    });
  }

  // TODO: Disabling retrieval of name for the moment as this would require
  // a soft restart to go back to API mode
  // async retrieveName() {
  //   try {
  //     const response = await this.execPythonCmd(
  //       "with open('local_name.txt') as f: print(f.read())\r\n",
  //     );
  //     this.name = response;
  //   } catch (err) {
  //     this.name = 'LEGO Hub';
  //   }
  //   this.emit('change');
  // }

  private executeSlotSpecificCommand(cmd: string, slotId: number) {
    this.assertDeviceInitialized();
    checkSlotId(slotId);
    return APIRequest(this.serialPort!, cmd, {
      slotid: slotId,
    });
  }

  public getSlots() {
    return this.storageStatus?.slots;
  }

  public async runProgram(slotId: number) {
    return this.executeSlotSpecificCommand('program_execute', slotId);
  }

  public async stopProgram() {
    this.assertDeviceInitialized();
    return APIRequest(this.serialPort!, 'program_terminate');
  }

  public async moveProgram(fromSlotId: number, toSlotId: number) {
    this.assertDeviceInitialized();
    checkSlotId(fromSlotId);
    checkSlotId(toSlotId);
    await APIRequest(this.serialPort!, 'move_project', {
      old_slotid: fromSlotId,
      new_slotid: toSlotId,
    });
    await this.refreshStorageStatus();
    this.emit('change');
  }

  public async removeProgram(slotId: number) {
    await this.executeSlotSpecificCommand('remove_project', slotId);
    await this.refreshStorageStatus();
    this.emit('change');
  }

  public async uploadProgram(prgName: string, prgText: string, slotId: number) {
    checkSlotId(slotId);

    const meta = {
      created: Date.now(),
      modified: Date.now(),
      name: encodeBase64(prgName),
      project_id: 'ScctlpwQVu64', // This seems to be mandatory for python files
      type: 'python',
    };
    const size = prgText.length;

    const start = (await APIRequest(this.serialPort!, 'start_write_program', {
      slotid: slotId,
      size: size,
      meta: meta,
    })) as any;

    const { blocksize, transferid } = start;
    for (let startPos = 0; startPos < size; startPos += blocksize) {
      const data = prgText.slice(
        startPos,
        Math.min(startPos + blocksize, size),
      );
      await APIRequest(this.serialPort!, 'write_package', {
        data: encodeBase64(data),
        transferid,
      });
    }
    this.refreshStorageStatus();
  }

  public async refreshStorageStatus() {
    this.assertDeviceInitialized();
    const storageStatus = (await APIRequest(
      this.serialPort!,
      'get_storage_status',
      {},
    )) as StorageStatus;
    this.storageStatus = storageStatus;
    this.emit('change');
  }

  public connect() {
    return new Promise<void>((resolve, reject) => {
      this.serialPort = new SerialPort(
        {
          path: this.ttyDevice,
          baudRate: 115200,
        },
        async (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });
  }

  public disconnect() {
    return new Promise<void>((resolve, reject) => {
      if (!this.serialPort) {
        resolve();
        return;
      }
      this.serialPort?.close(async (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

let device: Device | undefined = undefined;

export function isDeviceConnected() {
  return !!device;
}

export async function connectDevice(deviceName: string) {
  if (isDeviceConnected()) {
    throw new Error('Device already connected. First disconnect it...');
  }
  try {
    device = new Device(deviceName);
    await device.connect();
    return device.refreshStorageStatus();
  } catch (err) {
    device = undefined;
    throw err;
  }
}

export async function disconnectDevice() {
  await device?.disconnect();
  device = undefined;
}

export function execMethodOnDeviceSlot(method: string, slotId: number) {
  if (device) {
    (device as { [method: string]: any })[method](slotId);
  }
}

export function stopProgramOnDevice() {
  device?.stopProgram();
}

export function moveProgramOnDevice(fromSlotId: number, toSlotId: number) {
  device?.moveProgram(fromSlotId, toSlotId);
}

export function uploadProgramOnDevice(
  prgName: string,
  prgText: string,
  slotId: number,
) {
  device?.uploadProgram(prgName, prgText, slotId);
}

export function getDeviceInfo() {
  return {
    name: device?.name || '',
    firmwareVersion: device?.firmwareVersion || '',
  };
}

export function getDeviceSlots() {
  return device?.getSlots();
}

export function addDeviceOnChangeCallbak(callback: () => void) {
  device?.on('change', callback);
}

export function removeDeviceAllListeners() {
  device?.removeAllListeners();
}
