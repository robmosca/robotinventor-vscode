import { expect } from 'chai';
import { APIRequest } from '../../api';
import { SerialPortMock } from 'serialport';

describe('API Test Suite', function () {
  const defaultPortName = '/dev/echoserialport';

  const createPortMock = (data: string, opts?: any) => {
    return SerialPortMock.binding.createPort(defaultPortName, {
      echo: true,
      record: true,
      ...opts,
      readyData: Buffer.from(data),
    });
  };

  describe('Sends request', function () {
    it('retrieves the corresponding response', async function () {
      const reqId = '1234';
      createPortMock(`{"m":0, "r": "response", "i": "${reqId}"}\r`);
      const portMock = new SerialPortMock({
        path: defaultPortName,
        baudRate: 9600,
      });
      const response = await APIRequest(
        portMock,
        'request',
        { param1: '1', param2: 2 },
        500,
        undefined,
        reqId,
      );

      expect(portMock.port?.recording.toString()).to.equal(
        '{"m":"request","p":{"param1":"1","param2":2},"i":"1234"}\r',
      );
      expect(response).to.equal('response');
    });

    it('raises an exception in case of error', async function () {
      const reqId = '1234';

      createPortMock(
        `{"m":0, "e": "eyJtZXNzYWdlIjogImVycm9yIn0=", "i": "${reqId}"}\r`,
      );
      const portMock = new SerialPortMock({
        path: defaultPortName,
        baudRate: 9600,
      });

      try {
        await APIRequest(
          portMock,
          'request',
          { param1: '1', param2: 2 },
          500,
          undefined,
          reqId,
        );
      } catch (error) {
        expect(portMock.port?.recording.toString()).to.equal(
          '{"m":"request","p":{"param1":"1","param2":2},"i":"1234"}\r',
        );
        expect(error).instanceOf(Error);
        expect((error as Error).message).to.equal('error');
      }
    });

    it("times out if the response doesn't come back in time", async function () {
      const reqId = '1234';
      createPortMock('', { echo: false });
      const portMock = new SerialPortMock({
        path: defaultPortName,
        baudRate: 9600,
      });

      try {
        await APIRequest(
          portMock,
          'request',
          { param1: '1', param2: 2 },
          20,
          undefined,
          reqId,
        );
      } catch (error) {
        expect(portMock.port?.recording.toString()).to.equal(
          '{"m":"request","p":{"param1":"1","param2":2},"i":"1234"}\r',
        );
        expect(error).instanceOf(Error);
        expect((error as Error).message).to.equal(
          'Timeout while processing message \'{"m":"request","p":{"param1":"1","param2":2},"i":"1234"}\'',
        );
      }
    });

    it('uses the command resolver if provided', async function () {
      const reqId = '1234';
      createPortMock(
        `A line\r\nAnother line\r\ntreasure\r\nAnd a final line\r\n`,
      );
      const portMock = new SerialPortMock({
        path: defaultPortName,
        baudRate: 9600,
      });
      const response = await APIRequest(
        portMock,
        'request',
        { param1: '1', param2: 2 },
        500,
        (line) => {
          if (line.includes('treasure')) {
            return { resolve: true, returnValue: 'Success' };
          }
          return { resolve: false };
        },
        reqId,
      );

      expect(portMock.port?.recording.toString()).to.equal(
        '{"m":"request","p":{"param1":"1","param2":2},"i":"1234"}\r',
      );
      expect(response).to.equal('Success');
    });
  });
});
