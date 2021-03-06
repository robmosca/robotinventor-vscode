import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Test Suite", function () {
  vscode.window.showInformationMessage("Start all tests.");

  test("Activate the extension", async function () {
    const ext = vscode.extensions.getExtension("robmosca.robotinventor");
    assert.notStrictEqual(ext, undefined);
    assert.strictEqual(ext?.isActive, false);
    await ext?.activate();
    assert.strictEqual(ext?.isActive, true);
  });
});
