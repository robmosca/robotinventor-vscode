import {
  connectDevice,
  _testing,
  isDeviceConnected,
  disconnectDevice,
} from '../device';
import { SerialPortMock } from 'serialport';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as api from '../api';

chai.use(sinonChai);
const expect = chai.expect;

describe('Device', () => {
  const deviceName = '/dev/mock';
  const APIRequestStub = sinon.stub(api, 'APIRequest');

  beforeEach(() => {
    _testing.SerialPortType = SerialPortMock;
  });

  afterEach(() => {
    SerialPortMock.binding.reset();
    APIRequestStub.reset();
    disconnectDevice();
  });

  after(() => {
    APIRequestStub.restore();
  });

  const createPortMock = (data: string, opts?: any) => {
    return SerialPortMock.binding.createPort(deviceName, {
      echo: true,
      record: true,
      ...opts,
      readyData: Buffer.from(data),
    });
  };

  describe('connectDevice', function () {
    it('should connect to the device and refresh storage status', async function () {
      // Arrange
      createPortMock('');
      APIRequestStub.resolves({
        storage: { total: 100, used: 50, available: 50 },
        slots: {
          1: {
            name: 'Program 1',
            id: 1,
            project_id: 'asi3',
            modified: new Date(),
            type: 'python',
            created: new Date(),
            size: 123,
          },
          2: {
            name: 'Program 2',
            id: 2,
            project_id: 'erhw',
            modified: new Date(),
            type: 'python',
            created: new Date(),
            size: 321,
          },
        },
      });

      await connectDevice(deviceName);

      expect(isDeviceConnected()).to.be.true;

      expect(APIRequestStub).to.have.been.calledOnce;
      expect(APIRequestStub).to.have.been.calledWith(
        sinon.match.any,
        'get_storage_status',
        {},
      );
    });

    it('should throw an error if the device is already connected', async function () {
      // Arrange
      createPortMock('');

      await connectDevice(deviceName);

      let error: Error | undefined = undefined;
      try {
        await connectDevice(deviceName);
      } catch (err) {
        expect(err).instanceOf(Error);
        error = err as Error;
      }
      expect(error?.message).to.be.equal(
        'Device already connected. First disconnect it...',
      );
    });

    it('should throw an error if device connection fails', async function () {
      createPortMock('');

      let error: Error | undefined = undefined;
      try {
        await connectDevice('/dev/anotherDevice');
      } catch (err) {
        expect(err).instanceOf(Error);
        error = err as Error;
      }
      expect(error?.message).to.match(/^Port does not exist/);
    });

    it('should throw an error if refreshing storage status fails', async function () {
      createPortMock('');
      APIRequestStub.rejects(new Error('Some error'));

      let error: Error | undefined = undefined;
      try {
        await connectDevice(deviceName);
      } catch (err) {
        expect(err).instanceOf(Error);
        error = err as Error;
      }
      expect(error?.message).to.be.equal('Some error');
    });
  });
});
