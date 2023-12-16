import { expect } from 'chai';
import { SerialPortMock } from 'serialport';
import SerialProcessor from '../../SerialProcessor';

describe('SerialProcessor', () => {
  const defaultPath = '/dev/mock';

  beforeEach(() => {
    SerialPortMock.binding.createPort(defaultPath, {
      record: true,
      readyData: Buffer.from('OK'),
    });
  });

  afterEach(() => {
    SerialPortMock.binding.reset();
  });

  it('should send data and process response successfully', async () => {
    const port = new SerialPortMock({
      path: defaultPath,
      baudRate: 9600,
    });

    const serialProcessor = new SerialProcessor(port, (data) => {
      if (data === 'OK') {
        return { resolve: true, returnValue: 'Success' };
      }
      return { resolve: false };
    });

    const response = await serialProcessor.sendAndProcess('Test Message');

    expect(response).to.equal('Success');
  });

  it('should reject if the processing function throws an error', async () => {
    const port = new SerialPortMock({
      path: defaultPath,
      baudRate: 9600,
    });

    const serialProcessor = new SerialProcessor(port, () => {
      throw new Error('Error');
    });

    try {
      await serialProcessor.sendAndProcess('Test Message');
    } catch (error) {
      expect(error).instanceOf(Error);
      expect((error as Error).message).to.equal('Error');
    }
  });

  it('should write to the port the message and the carriage return', async () => {
    const port = new SerialPortMock({
      path: defaultPath,
      baudRate: 9600,
    });

    const serialProcessor = new SerialProcessor(port, (data) => {
      if (data === 'OK') {
        return { resolve: true, returnValue: 'Success' };
      }
      return { resolve: false };
    });

    await serialProcessor.sendAndProcess('Test Message');

    expect(port.port?.recording.toString()).to.equal('Test Message\r');
  });
});
