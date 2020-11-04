export class Device {
  constructor(public name: string, public firmwareVersion: string) {}

  static async pickDevice() {
    return new Device("Test device", "0.1.0");
  }

  public async connect() {
    return new Promise((resolve) => setTimeout(resolve, 3000));
  }
}
