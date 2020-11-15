import * as SerialPort from "serialport";

export default class HubAPI {
  constructor(public readonly port: SerialPort) {}
}
