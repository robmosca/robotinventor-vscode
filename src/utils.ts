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

export async function listFiles(filesGlob: string) {
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

export function encodeBase64(data: string) {
  const b = Buffer.from(data);
  return b.toString("base64");
}

export function formatFilesize(bytes: number, decimals = 2) {
  if (bytes === 0) {
    return "0 B";
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const displaySize = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  return `${displaySize} ${sizes[i]}`;
}
