import * as vscode from "vscode";
import { glob } from "glob";

const toastDuration = 5000;

export function showTemporaryStatusBarMessage(message: string): void {
  vscode.window.setStatusBarMessage(message, toastDuration);
}

async function listFiles(filesGlob: string) {
  return new Promise<string[]>((resolve, reject) => {
    glob(filesGlob, function (err: Error | null, files: string[]) {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });
}
