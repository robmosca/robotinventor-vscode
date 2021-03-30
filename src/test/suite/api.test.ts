import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as chai from "chai";
import API from "../../api";

const SerialPort = require("@serialport/stream");
const MockBinding = require("@serialport/binding-mock");

chai.use(sinonChai);
const expect = chai.expect;

suite("API Test Suite", function () {
  suite("Waits for the API to be ready", function () {
    test("Waits for API to be ready", async function () {
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

    test("Times out if the device does not emit the correct sequence", async function () {
      MockBinding.createPort("/dev/echoserialport", {
        echo: true,
        record: true,
        readyData: Buffer.from(""),
      });
      SerialPort.Binding = MockBinding;
      const port = new SerialPort("/dev/echoserialport");
      const api = new API(port);

      try {
        await api.waitAPIready(500);
      } catch (err) {
        expect(err.message).to.equal("Timeout while processing message '\x04'");
      }
    });
  });

  suite("Sends request", function () {
    test("and retrieve the corresponding response", async function () {
      const reqId = "1234";

      MockBinding.createPort("/dev/echoserialport", {
        echo: true,
        record: true,
        readyData: Buffer.from(`{"m":0, "r": "response", "i": "${reqId}"}\r`),
      });
      SerialPort.Binding = MockBinding;
      const port = new SerialPort("/dev/echoserialport");
      const api = new API(port);

      const response = await api.sendRequest(
        "request",
        { param1: "1", param2: 2 },
        500,
        reqId
      );

      expect(port.binding.recording.toString()).to.equal(
        '{"m":"request","p":{"param1":"1","param2":2},"i":"1234"}\r'
      );
      expect(response).to.equal("response");
    });

    test("and raises an exception in case of error", async function () {
      const reqId = "1234";

      MockBinding.createPort("/dev/echoserialport", {
        echo: true,
        record: true,
        readyData: Buffer.from(
          `{"m":0, "e": "eyJtZXNzYWdlIjogImVycm9yIn0=", "i": "${reqId}"}\r`
        ),
      });
      SerialPort.Binding = MockBinding;
      const port = new SerialPort("/dev/echoserialport");
      const api = new API(port);

      try {
        const response = await api.sendRequest(
          "request",
          { param1: "1", param2: 2 },
          500,
          reqId
        );
      } catch (error) {
        expect(port.binding.recording.toString()).to.equal(
          '{"m":"request","p":{"param1":"1","param2":2},"i":"1234"}\r'
        );
        expect(error.message).to.equal("error");
      }
    });

    test("and times out if the response does not come back in time", async function () {
      const reqId = "1234";
      MockBinding.createPort("/dev/echoserialport", {
        echo: false,
        record: true,
        readyData: Buffer.from(""),
      });
      SerialPort.Binding = MockBinding;
      const port = new SerialPort("/dev/echoserialport");
      const api = new API(port);

      try {
        const response = await api.sendRequest(
          "request",
          { param1: "1", param2: 2 },
          500,
          reqId
        );
      } catch (error) {
        expect(port.binding.recording.toString()).to.equal(
          '{"m":"request","p":{"param1":"1","param2":2},"i":"1234"}\r'
        );
        expect(error.message).to.equal(
          'Timeout while processing message \'{"m":"request","p":{"param1":"1","param2":2},"i":"1234"}\''
        );
      }
    });
  });
});
