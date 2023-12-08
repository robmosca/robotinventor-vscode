import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chai from 'chai';
import SerialProcessor from '../../../SerialProcessor';

const SerialPort = require('@serialport/stream');
const MockBinding = require('@serialport/binding-mock');

chai.use(sinonChai);
const expect = chai.expect;

suite('SerialProcessor Test Suite', () => {
  setup(function () {
    MockBinding.reset();
  });

  test('Sends the message and processes the reply', async function () {
    const callback = sinon.stub();
    callback.returns({ resolve: true, returnValue: 'This is the answer' });
    MockBinding.createPort('/dev/echoserialport', {
      echo: true,
      record: true,
      readyData: Buffer.from([]),
    });
    SerialPort.Binding = MockBinding;
    const port = new SerialPort('/dev/echoserialport');
    const sp = new SerialProcessor(port, callback);

    const response = await sp.sendAndProcess('test message', 30);

    expect(port.binding.recording.toString()).to.equal('test message\r');
    expect(callback).to.have.been.calledWith('test message\r');
    expect(response).to.equal('This is the answer');
  });

  test('Times out after n milliseconds', async function () {
    const callback = sinon.stub();
    callback.returns({ resolve: true, returnValue: 'This is the answer' });
    MockBinding.createPort('/dev/muteserialport', {
      echo: false,
      record: true,
      readyData: Buffer.from([]),
    });
    SerialPort.Binding = MockBinding;
    const port = new SerialPort('/dev/muteserialport');
    const sp = new SerialProcessor(port, callback);

    try {
      await sp.sendAndProcess('test message', 30);
    } catch (err) {
      expect(port.binding.recording.toString()).to.equal('test message\r');
      expect(callback).to.not.have.been.called;
      expect(err.message).to.equal(
        "Timeout while processing message 'test message'",
      );
    }
  });
});
