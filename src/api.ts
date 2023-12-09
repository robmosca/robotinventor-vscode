import { SerialPort } from 'serialport';
import SerialProcessor from './SerialProcessor';
import { decodeBase64, randomId } from './utils';

type ParsedLine = {
  e?: string;
  i?: string;
  r?: unknown;
};

type ProcessingFunctionReturnValue = {
  resolve: boolean;
  returnValue?: any;
};

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
    cmdResolver?: (line: string) => ProcessingFunctionReturnValue,
    reqId?: string,
  ): Promise<unknown> {
    const id = reqId ?? randomId();
    const msg = { m: request, p: params, i: id };
    const serializedMsg = JSON.stringify(msg);
    let response = '';
    const serialProcessor = new SerialProcessor(this.serialPort, (data) => {
      function defaultCmdResolver(line: string) {
        let parsedLine: ParsedLine = {};

        try {
          parsedLine = JSON.parse(line);
        } catch (err) {}

        if (parsedLine.e) {
          const err = JSON.parse(decodeBase64(parsedLine.e));
          throw new Error(err.message);
        }

        if (parsedLine.i === id) {
          return { resolve: true, returnValue: parsedLine.r };
        }
        return { resolve: false };
      }

      const crPos = data.indexOf('\r');
      const crNlPos = data.indexOf('\r\n');
      if (crPos === -1) {
        response += data;
        return { resolve: false };
      }

      const accData = response + data;
      const lines =
        crNlPos !== -1 ? accData.split('\r\n') : accData.split('\r');
      for (let i = 0; i < lines.length - 1; ++i) {
        const resolution = cmdResolver
          ? cmdResolver(lines[i])
          : defaultCmdResolver(lines[i]);
        if (resolution.resolve) {
          return resolution;
        }
      }

      response = lines[lines.length - 1];
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
  cmdResolver?: (line: string) => ProcessingFunctionReturnValue,
) {
  return new API(serialPort).sendRequest(
    request,
    params,
    timeout_in_ms,
    cmdResolver,
  );
}

export const _testing = {
  API,
};
