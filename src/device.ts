const serialPort = require("serialport");

export class Device {
  public ttyDevice: string;
  public name: string;
  public firmwareVersion: string;
  public serialPort: any;

  constructor(ttyDevice: string) {
    this.ttyDevice = ttyDevice;
    this.name = ttyDevice;
    this.firmwareVersion = "";
    this.serialPort = undefined;
  }

  static async selectDevice() {
    return new Device("/dev/tty.usbmodem3377397C33381");
  }

  public connect() {
    return new Promise((resolve, reject) => {
      this.serialPort = new serialPort(
        this.ttyDevice,
        {
          baudRate: 115200,
        },
        function (err: Error) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }
}
