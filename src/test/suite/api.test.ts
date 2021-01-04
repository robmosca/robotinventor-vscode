import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as chai from "chai";
import API from "../../api";

const SerialPort = require("@serialport/stream");
const MockBinding = require("@serialport/binding-mock");

chai.use(sinonChai);
const expect = chai.expect;

suite("API Test Suite", () => {
  suite("Waits for the API to be ready", () => {
    test("Waits for API to be ready", async () => {
      MockBinding.createPort("/dev/echoserialport", {
        echo: true,
        record: true,
        readyData: Buffer.from('{"m":0, e: "", i: ""}\r'),
      });
      SerialPort.Binding = MockBinding;
      const port = new SerialPort("/dev/echoserialport");
      const api = new API(port);

      await api.waitAPIready();

      expect(port.binding.recording.toString()).to.equal("\x04\r");
    });

    test("Times out if the device does not emit the correct sequence", () => {
      // TODO
    });
  });

  suite("Sends request", () => {
    test("and retrieve the corresponding response", () => {
      // TODO
    });

    test("and times out if the response does not come back in time", () => {
      // TODO
    });
  });
});
