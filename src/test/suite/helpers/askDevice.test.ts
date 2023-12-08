import * as vscode from 'vscode';
import * as chai from 'chai';
import { askDeviceFromList } from '../../../extension';

const SerialPort = require('@serialport/stream');
const MockBinding = require('@serialport/binding-mock');

const expect = chai.expect;

suite('askDeviceFromList Test Suite', function () {
  setup(function () {
    MockBinding.reset();
  });

  test('Select port corresponding to a LEGO Hub', async function () {
    MockBinding.createPort('/dev/hubserialport', {
      echo: true,
      record: true,
      readyData: Buffer.from([]),
      manufacturer: 'LEGO System A/S',
    });
    SerialPort.Binding = MockBinding;

    const response = askDeviceFromList("I don't see my device...");

    await vscode.commands.executeCommand(
      'workbench.action.quickOpenSelectNext',
    );
    await vscode.commands.executeCommand(
      'workbench.action.acceptSelectedQuickOpenItem',
    );

    const data = await response;
    expect(data).to.equal('/dev/hubserialport');
  });

  test('Shows only ports corresponding to a LEGO Hub', async function () {
    MockBinding.createPort('/dev/anotherserialport', {
      echo: true,
      record: true,
      readyData: Buffer.from([]),
    });
    SerialPort.Binding = MockBinding;

    const response = askDeviceFromList("I don't see my device...");

    await vscode.commands.executeCommand(
      'workbench.action.quickOpenSelectNext',
    );
    await vscode.commands.executeCommand(
      'workbench.action.acceptSelectedQuickOpenItem',
    );

    const data = await response;
    expect(data).to.equal("I don't see my device...");
  });
});
