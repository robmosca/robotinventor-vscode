import * as vscode from "vscode";
import { glob } from "glob";
import { randomInt } from "crypto";

const toastDuration = 5000;

function getRandomInt(max: number) {
  return Math.floor(Math.random() * Math.floor(max));
}

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

export function randomId(length: number = 4) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  const charsLength = chars.length;
  for (var i = 0; i < 4; i++) {
    result += chars.charAt(getRandomInt(charsLength));
  }
  return result;
}

export function decodeBase64(data: string) {
  const b = Buffer.from(data, "base64");
  return b.toString("utf-8");
}
