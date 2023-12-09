// import * as chai from 'chai';
// import { _testing } from '../api';
// import { SerialPort, SerialPortMock } from 'serialport';

// const expect = chai.expect;

// const API = _testing.API;

// suite('API Test Suite', function () {
//   const defaultPortName = '/dev/echoserialport';

//   const createPortMock = (data: string, opts?: any) => {
//     return SerialPortMock.binding.createPort(defaultPortName, {
//       echo: true,
//       record: true,
//       ...opts,
//       readyData: Buffer.from(data),
//     });
//   };

//   suite('Waits for the API to be ready', function () {
//     test.only('Waits for API to be ready', async function () {
//       createPortMock('{"m":0, "r": "response", "i": "1234"}\r');
//       const port = new SerialPort({ path: defaultPortName, baudRate: 9600 });
//       const api = new API(port);

//       await api.waitAPIready();

//       const portMock = await SerialPortMock.binding.open({
//         path: defaultPortName,
//         baudRate: 9600,
//       });
//       expect(portMock.recording.toString()).to.equal('\x04\r');
//     });

//     test('Times out if the device does not emit the correct sequence', async function () {
//       createPortMock('');
//       const port = new SerialPort({ path: defaultPortName, baudRate: 9600 });
//       const api = new API(port);

//       try {
//         await api.waitAPIready(500);
//       } catch (error) {
//         expect(error).instanceOf(Error);
//         expect((error as Error).message).to.equal(
//           "Timeout while processing message '\x04'",
//         );
//       }
//     });
//   });

//   suite('Sends request', function () {
//     test('and retrieve the corresponding response', async function () {
//       const reqId = '1234';

//       createPortMock(`{"m":0, "r": "response", "i": "${reqId}"}\r`);
//       const portMock = await SerialPortMock.binding.open({
//         path: defaultPortName,
//         baudRate: 9600,
//       });
//       const port = new SerialPort({ path: defaultPortName, baudRate: 9600 });
//       const api = new API(port);

//       const response = await api.sendRequest(
//         'request',
//         { param1: '1', param2: 2 },
//         500,
//         undefined,
//         reqId,
//       );

//       expect(portMock.recording.toString()).to.equal(
//         '{"m":"request","p":{"param1":"1","param2":2},"i":"1234"}\r',
//       );
//       expect(response).to.equal('response');
//     });

//     test('and raises an exception in case of error', async function () {
//       const reqId = '1234';

//       createPortMock(
//         `{"m":0, "e": "eyJtZXNzYWdlIjogImVycm9yIn0=", "i": "${reqId}"}\r`,
//       );
//       const portMock = await SerialPortMock.binding.open({
//         path: defaultPortName,
//         baudRate: 9600,
//       });
//       const port = new SerialPort({ path: defaultPortName, baudRate: 9600 });
//       const api = new API(port);

//       try {
//         await api.sendRequest(
//           'request',
//           { param1: '1', param2: 2 },
//           500,
//           undefined,
//           reqId,
//         );
//       } catch (error) {
//         expect(portMock.recording.toString()).to.equal(
//           '{"m":"request","p":{"param1":"1","param2":2},"i":"1234"}\r',
//         );
//         expect(error).instanceOf(Error);
//         expect((error as Error).message).to.equal('error');
//       }
//     });

//     test('and times out if the response does not come back in time', async function () {
//       const reqId = '1234';
//       createPortMock('', { echo: false });
//       const portMock = await SerialPortMock.binding.open({
//         path: defaultPortName,
//         baudRate: 9600,
//       });
//       const port = new SerialPort({ path: defaultPortName, baudRate: 9600 });
//       const api = new API(port);

//       try {
//         await api.sendRequest(
//           'request',
//           { param1: '1', param2: 2 },
//           500,
//           undefined,
//           reqId,
//         );
//       } catch (error) {
//         expect(portMock.recording.toString()).to.equal(
//           '{"m":"request","p":{"param1":"1","param2":2},"i":"1234"}\r',
//         );
//         expect(error).instanceOf(Error);
//         expect((error as Error).message).to.equal(
//           'Timeout while processing message \'{"m":"request","p":{"param1":"1","param2":2},"i":"1234"}\'',
//         );
//       }
//     });
//   });
// });
