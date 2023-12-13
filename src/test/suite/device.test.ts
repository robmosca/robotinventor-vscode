import {
  connectDevice,
  _testing,
  isDeviceConnected,
  disconnectDevice,
  runProgramOnDevice,
  removeProgramFromDevice,
  uploadProgramToDevice,
  getDeviceSlots,
  stopProgramOnDevice,
  moveProgramOnDevice,
  addDeviceOnChangeCallbak,
  getDeviceInfo,
  removeDeviceAllListeners,
  listDevices,
} from '../../device';
import { SerialPortMock } from 'serialport';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as api from '../../api';

chai.use(sinonChai);
const expect = chai.expect;

describe('Device', () => {
  const deviceName = '/dev/mock';
  const APIRequestStub = sinon.stub(api, 'APIRequest');
  const defaultSlots = {
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
  };

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

  const createPortMock = (alternativeName?: string) => {
    return SerialPortMock.binding.createPort(alternativeName || deviceName, {
      echo: true,
      record: true,
      readyData: Buffer.from(''),
    });
  };

  const getStorageInfo = (additionalSlots?: any) => {
    return {
      storage: { total: 100, used: 50, available: 50 },
      slots: {
        ...defaultSlots,
        ...additionalSlots,
      },
    };
  };

  const basicMockAPIRequestStub = () => {
    APIRequestStub.callsFake((port, method) => {
      if (method === 'get_storage_status') {
        return Promise.resolve(getStorageInfo());
      } else if (method === 'get_hub_info') {
        return Promise.resolve({
          firmware: {
            version: [1, 2, 3, 0],
            checksum: '1e60',
          },
        });
      } else {
        return Promise.resolve({});
      }
    });
  };

  describe('connectDevice', function () {
    it('should connect to the device and refresh storage status', async function () {
      createPortMock('');
      basicMockAPIRequestStub();

      await connectDevice(deviceName);

      expect(isDeviceConnected()).to.be.true;

      expect(APIRequestStub).to.have.been.calledTwice;
      expect(APIRequestStub).to.have.been.calledWith(
        sinon.match.any,
        'get_storage_status',
        {},
      );
      expect(APIRequestStub).to.have.been.calledWith(
        sinon.match.any,
        'get_hub_info',
        {},
      );
    });

    it('should throw an error if the device is already connected', async function () {
      createPortMock('');
      basicMockAPIRequestStub();

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

  describe('disconnectDevice', function () {
    it('should disconnect the device', async function () {
      createPortMock('');
      basicMockAPIRequestStub();

      await connectDevice(deviceName);

      expect(isDeviceConnected()).to.be.true;

      await disconnectDevice();

      expect(isDeviceConnected()).to.be.false;
    });

    it('should do nothing if the device is not connected', async function () {
      await disconnectDevice();

      expect(isDeviceConnected()).to.be.false;
    });
  });

  describe('runProgramOnDevice', function () {
    it('should run a program on a device slot', async function () {
      createPortMock('');
      basicMockAPIRequestStub();

      await connectDevice(deviceName);

      APIRequestStub.reset();
      APIRequestStub.resolves({});

      runProgramOnDevice(12);

      expect(APIRequestStub).to.have.been.calledOnce;
      expect(APIRequestStub).to.have.been.calledWith(
        sinon.match.any,
        'program_execute',
        { slotid: 12 },
      );
    });

    it('should throw an error if the slot is not valid', async function () {
      createPortMock('');
      basicMockAPIRequestStub();

      await connectDevice(deviceName);

      APIRequestStub.reset();
      APIRequestStub.resolves({});

      let error: Error | undefined = undefined;
      try {
        await runProgramOnDevice(24);
      } catch (err) {
        expect(err).instanceOf(Error);
        error = err as Error;
      }
      expect(error?.message).to.be.equal(
        'Invalid program slot index 24, valid slots: 0-19',
      );
    });
  });

  describe('stopProgramOnDevice', function () {
    it('should stop a running program on a device slot', async function () {
      createPortMock('');
      basicMockAPIRequestStub();

      await connectDevice(deviceName);

      APIRequestStub.reset();
      APIRequestStub.resolves({});

      stopProgramOnDevice();

      expect(APIRequestStub).to.have.been.calledOnce;
      expect(APIRequestStub).to.have.been.calledWith(
        sinon.match.any,
        'program_terminate',
        {},
        sinon.match.any,
      );
    });
  });

  describe('moveProgramOnDevice', function () {
    it('should move a program from one slot to another', async function () {
      createPortMock('');
      basicMockAPIRequestStub();

      await connectDevice(deviceName);

      APIRequestStub.reset();
      APIRequestStub.resolves({});
      const onChangeFn = sinon.spy();

      addDeviceOnChangeCallbak(onChangeFn);

      await moveProgramOnDevice(12, 15);

      expect(APIRequestStub).to.have.been.calledTwice;
      expect(APIRequestStub).to.have.been.calledWith(
        sinon.match.any,
        'move_project',
        { old_slotid: 12, new_slotid: 15 },
      );
      expect(APIRequestStub).to.have.been.calledWith(
        sinon.match.any,
        'get_storage_status',
        {},
      );
      expect(onChangeFn).to.have.been.calledOnce;
    });
  });

  describe('removeProgramFromDevice', function () {
    it('should remove a program from a device slot', async function () {
      createPortMock('');
      basicMockAPIRequestStub();

      await connectDevice(deviceName);

      APIRequestStub.reset();
      APIRequestStub.resolves({});
      const onChangeFn = sinon.spy();

      addDeviceOnChangeCallbak(onChangeFn);

      await removeProgramFromDevice(12);

      expect(APIRequestStub).to.have.been.calledTwice;
      expect(APIRequestStub).to.have.been.calledWith(
        sinon.match.any,
        'remove_project',
        { slotid: 12 },
      );
      expect(APIRequestStub).to.have.been.calledWith(
        sinon.match.any,
        'get_storage_status',
        {},
      );
      expect(onChangeFn).to.have.been.calledOnce;
    });

    it('should throw an error if the slot is not valid', async function () {
      createPortMock('');
      basicMockAPIRequestStub();

      await connectDevice(deviceName);

      APIRequestStub.reset();
      APIRequestStub.resolves({});

      let error: Error | undefined = undefined;
      try {
        await removeProgramFromDevice(24);
      } catch (err) {
        expect(err).instanceOf(Error);
        error = err as Error;
      }
      expect(error?.message).to.be.equal(
        'Invalid program slot index 24, valid slots: 0-19',
      );
    });
  });

  describe('uploadProgramToDevice', function () {
    it('should upload a program to a device slot', async function () {
      const additionalSlots = {
        3: {
          name: 'Program 3',
          id: 3,
          project_id: '2g3e',
          modified: new Date(),
          type: 'python',
          created: new Date(),
          size: 321,
        },
      };
      createPortMock('');
      basicMockAPIRequestStub();

      await connectDevice(deviceName);

      APIRequestStub.callsFake((port, method) => {
        if (method === 'start_write_program') {
          return Promise.resolve({ blocksize: 16, transferid: 'a123' });
        } else if (method === 'get_storage_status') {
          return Promise.resolve(getStorageInfo(additionalSlots));
        } else {
          return Promise.resolve({});
        }
      });
      const prgText = `
        print("Hello world")
        print("This is a sample program")
        print("It only prints stuff...")
        print("...but it's a good start!")
      `;
      const size = prgText.length;
      const onChangeFn = sinon.spy();

      addDeviceOnChangeCallbak(onChangeFn);

      await uploadProgramToDevice('Program 3', prgText, 12);

      expect(APIRequestStub.callCount).to.equal(15);
      expect(APIRequestStub).to.have.been.calledWith(
        sinon.match.any,
        'start_write_program',
        {
          slotid: 12,
          size,
          meta: {
            created: sinon.match.any,
            modified: sinon.match.any,
            name: 'UHJvZ3JhbSAz',
            project_id: 'ScctlpwQVu64', // This seems to be mandatory for python files
            type: 'python',
          },
        },
      );
      expect(APIRequestStub).to.have.been.calledWith(
        sinon.match.any,
        'get_hub_info',
        {},
      );
      expect(APIRequestStub).to.have.been.calledWith(
        sinon.match.any,
        'write_package',
        {
          data: sinon.match.any,
          transferid: 'a123',
        },
      );
      expect(APIRequestStub).to.have.been.calledWith(
        sinon.match.any,
        'get_storage_status',
        {},
      );

      const slots = await getDeviceSlots();
      expect(slots).to.deep.equal({
        ...defaultSlots,
        ...additionalSlots,
      });
      expect(onChangeFn).to.have.been.calledOnce;
    });
  });

  describe('getDeviceInfo', function () {
    it('should return the device info', async function () {
      createPortMock('');
      basicMockAPIRequestStub();

      await connectDevice(deviceName);

      const info = getDeviceInfo();

      expect(info).to.deep.equal({
        name: '/dev/mock',
        firmwareVersion: '1.2.03.0000-1e60',
      });
    });
  });

  describe('getDeviceSlots', function () {
    it('should return the device slots', async function () {
      createPortMock('');
      basicMockAPIRequestStub();

      await connectDevice(deviceName);

      const slots = await getDeviceSlots();

      expect(slots).to.deep.equal(defaultSlots);
    });
  });

  describe('removeDeviceAllListeners', function () {
    it('should remove all listeners', async function () {
      createPortMock('');
      basicMockAPIRequestStub();

      await connectDevice(deviceName);

      const onChangeFn = sinon.spy();
      addDeviceOnChangeCallbak(onChangeFn);

      await removeProgramFromDevice(12);

      expect(onChangeFn).to.have.been.calledOnce;

      removeDeviceAllListeners();

      await removeProgramFromDevice(12);

      expect(onChangeFn).to.have.been.calledOnce;
    });
  });

  describe('listDevices', function () {
    it('should list all available devices', async function () {
      createPortMock('/dev/usbmodem1');
      createPortMock('/dev/usbmodem2');

      const devices = await listDevices();

      expect(devices).to.have.lengthOf(2);
      expect(devices[0].path).to.equal('/dev/usbmodem1');
      expect(devices[1].path).to.equal('/dev/usbmodem2');
    });
  });
});
