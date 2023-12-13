import { SerialPort, SerialPortMock } from 'serialport';
import { EventEmitter } from 'events';
import { APIRequest } from './api';
import { encodeBase64 } from './utils';

const _testing: {
  SerialPortType: typeof SerialPort | typeof SerialPortMock;
} = {
  SerialPortType: SerialPort,
};

export type SlotType = 'all' | 'empty' | 'full';

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
  ttyDevice: string;
  name: string;
  firmwareVersion: string;
  serialPort: SerialPort | SerialPortMock | undefined;
  devMode: DeviceMode;
  storageStatus: StorageStatus | undefined;

  constructor(ttyDevice: string) {
    super();
    this.devMode = DeviceMode.API;
    this.firmwareVersion = '';
    this.name = 'LEGO Hub';
    this.name = ttyDevice;
    this.serialPort = undefined;
    this.ttyDevice = ttyDevice;
  }

  private assertConnected() {
    if (!this.serialPort) {
      throw new Error('Device not initialized');
    }
  }

  private executeSlotSpecificCommand(cmd: string, slotId: number) {
    this.assertConnected();
    checkSlotId(slotId);
    return APIRequest(this.serialPort!, cmd, {
      slotid: slotId,
    });
  }

  async retrieveHubInfo() {
    const info = (await APIRequest(this.serialPort!, 'get_hub_info', {})) as {
      firmware: {
        version: number[];
        checksum: string;
      };
    };
    const [major, minor, patch, build] = info.firmware.version;

    this.firmwareVersion = `${major}.${minor}.${String(patch).padStart(
      2,
      '0',
    )}.${String(build).padStart(4, '0')}-${info.firmware.checksum}`;
  }

  getSlots() {
    return this.storageStatus?.slots;
  }

  async runProgram(slotId: number) {
    return this.executeSlotSpecificCommand('program_execute', slotId);
  }

  async stopProgram() {
    this.assertConnected();
    return APIRequest(
      this.serialPort!,
      'program_terminate',
      {},
      5000,
      (line) => {
        if (line.includes('SystemExit:')) {
          return { resolve: true };
        }
        return { resolve: false };
      },
    );
  }

  async moveProgram(fromSlotId: number, toSlotId: number) {
    this.assertConnected();
    checkSlotId(fromSlotId);
    checkSlotId(toSlotId);
    await APIRequest(this.serialPort!, 'move_project', {
      old_slotid: fromSlotId,
      new_slotid: toSlotId,
    });
    return this.refreshStorageStatus();
  }

  async removeProgram(slotId: number) {
    await this.executeSlotSpecificCommand('remove_project', slotId);
    return this.refreshStorageStatus();
  }

  async uploadProgram(prgName: string, prgText: string, slotId: number) {
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
    return this.refreshStorageStatus();
  }

  async refreshStorageStatus() {
    this.assertConnected();
    const storageStatus = (await APIRequest(
      this.serialPort!,
      'get_storage_status',
      {},
    )) as StorageStatus;
    this.storageStatus = storageStatus;
    this.emit('change');
  }

  connect() {
    return new Promise<void>((resolve, reject) => {
      this.serialPort = new _testing.SerialPortType(
        {
          path: this.ttyDevice,
          baudRate: 115200,
        },
        async (err) => {
          if (err) {
            this.serialPort = undefined;
            reject(err);
          } else {
            resolve();
          }
        },
      );
    }).then(() => this.retrieveHubInfo());
  }

  disconnect() {
    return new Promise<void>((resolve, reject) => {
      if (!this.serialPort) {
        resolve();
        return;
      }
      this.serialPort?.close(async (err) => {
        if (err) {
          reject(err);
        } else {
          this.serialPort = undefined;
          resolve();
        }
      });
    });
  }

  isConnected() {
    return !!this.serialPort;
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
  } catch (err) {
    device = undefined;
    throw err;
  }

  try {
    return device.refreshStorageStatus();
  } catch (err) {
    await device?.disconnect();
    device = undefined;
    throw err;
  }
}

export async function disconnectDevice() {
  await device?.disconnect();
  device = undefined;
}

export async function runProgramOnDevice(slotId: number) {
  return device?.runProgram(slotId);
}

export async function stopProgramOnDevice() {
  return device?.stopProgram();
}

export async function moveProgramOnDevice(
  fromSlotId: number,
  toSlotId: number,
) {
  return device?.moveProgram(fromSlotId, toSlotId);
}

export async function removeProgramFromDevice(slotId: number) {
  return device?.removeProgram(slotId);
}

export function uploadProgramToDevice(
  prgName: string,
  prgText: string,
  slotId: number,
) {
  return device?.uploadProgram(prgName, prgText, slotId);
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

export { _testing };
