import { SerialPort } from 'serialport';
import SerialProcessor from './SerialProcessor';
import { decodeBase64, randomId } from './utils';

class API {
  constructor(private serialPort: SerialPort) {}

  async waitAPIready(timeout: number = 2000) {
    const serialProcessor = new SerialProcessor(this.serialPort, (data) => {
      if (data.startsWith('{"m":0')) {
        return { resolve: true };
      }
      return { resolve: false };
    });

    return serialProcessor.sendAndProcess('\x04', timeout);
  }

  public async sendRequest(
    request: string,
    params: object,
    timeout_in_ms: number = 5000,
    reqId?: string,
  ): Promise<unknown> {
    const id = reqId ?? randomId();
    const msg = { m: request, p: params, i: id };
    const serializedMsg = JSON.stringify(msg);
    let response = '';
    const serialProcessor = new SerialProcessor(this.serialPort, (data) => {
      const crPos = data.indexOf('\r');
      if (crPos !== -1) {
        const accData = response + data;
        const lines = accData.split('\r');
        for (let i = 0; i < lines.length - 1; ++i) {
          let parsedLine: {
            e?: string;
            i?: string;
            r?: unknown;
          } = {};

          try {
            parsedLine = JSON.parse(lines[i]);
          } catch (err) {}

          if (parsedLine.e) {
            const err = JSON.parse(decodeBase64(parsedLine.e));
            throw new Error(err.message);
          }

          if (parsedLine.i === id) {
            return { resolve: true, returnValue: parsedLine.r };
          }
        }
        response = lines[lines.length - 1];
      } else {
        response += data;
      }
      return { resolve: false };
    });

    return serialProcessor.sendAndProcess(`${serializedMsg}`, timeout_in_ms);
  }
}

export function APIRequest(
  serialPort: SerialPort,
  request: string,
  params: object = {},
  timeout_in_ms: number = 5000,
) {
  return new API(serialPort).sendRequest(request, params, timeout_in_ms);
}

export const _testing = {
  API,
};
