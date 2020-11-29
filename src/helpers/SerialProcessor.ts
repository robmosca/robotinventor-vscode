import * as SerialPort from "serialport";

type ProcessingFunctionReturnValue = {
  resolve: boolean;
  returnValue?: any;
};

type ProcessingFunction = (
  data: string
) => ProcessingFunctionReturnValue | undefined;

export default class SerialProcessor {
  constructor(
    private serialPort: SerialPort,
    private processingFunction: ProcessingFunction
  ) {}

  public async sendAndProcess(msg: string, timeout_in_ms: number = 1000) {
    return new Promise((resolve, reject) => {
      let timeout: NodeJS.Timeout | undefined = undefined;

      const emptyBuffer = () => {
        while (true) {
          if (this.serialPort.read() === null) {
            return;
          }
        }
      };
      const cleanUp = () => {
        if (timeout) {
          clearTimeout(timeout);
          timeout = undefined;
        }
        this.serialPort.removeListener("data", processData);
      };

      const processData = (data: Buffer) => {
        const stringData = data.toString();
        try {
          const result = this.processingFunction(stringData);
          if (result?.resolve) {
            cleanUp();
            resolve(result.returnValue);
          }
        } catch (err) {
          cleanUp();
          reject(err);
        }
      };

      const errorHandler = (error: Error | null | undefined) => {
        if (error) {
          cleanUp();
          reject(error);
        }
      };

      emptyBuffer();
      this.serialPort.write(Buffer.from(msg), errorHandler);
      this.serialPort.write(Buffer.from("\r"), errorHandler);
      this.serialPort.drain((error?: Error | null) => {
        errorHandler(error);
        this.serialPort.on("data", processData);
      });

      timeout = setTimeout(() => {
        this.serialPort.removeListener("data", processData);
        reject(new Error(`Timeout while processing msg ${msg}`));
      }, timeout_in_ms);
    });
  }
}
