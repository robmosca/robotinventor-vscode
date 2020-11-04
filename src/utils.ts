import * as vscode from "vscode";

const toastDuration = 5000;

export function showTemporaryStatusBarMessage(message: string): void {
  vscode.window.setStatusBarMessage(message, toastDuration);
}
