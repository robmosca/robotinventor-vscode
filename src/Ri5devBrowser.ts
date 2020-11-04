import * as vscode from "vscode";
import * as path from "path";
import { Device } from "./device";

class DeviceTreeItem extends vscode.TreeItem {
  constructor(public device: Device) {
    super(device.name, vscode.TreeItemCollapsibleState.None);
    this.tooltip = device.name;
    this.description = device.firmwareVersion;
  }

  iconPath = {
    light: path.join(__dirname, "..", "resources", "light", "device.svg"),
    dark: path.join(__dirname, "..", "resources", "dark", "device.svg"),
  };
}

class CommandTreeItem extends vscode.TreeItem {
  constructor(label: string, command?: string) {
    super(label);
    if (command) {
      this.command = {
        command: command,
        title: "",
      };
    }
  }
}

type BrowserTreeItem = DeviceTreeItem | CommandTreeItem;

export class Ri5devBrowserProvider
  implements vscode.TreeDataProvider<BrowserTreeItem> {
  private device: DeviceTreeItem | undefined;
  private _onDidChangeTreeData: vscode.EventEmitter<
    BrowserTreeItem | undefined | null | void
  > = new vscode.EventEmitter<BrowserTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    BrowserTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  constructor() {}

  public getTreeItem(element: DeviceTreeItem): vscode.TreeItem {
    return element;
  }

  public getChildren(
    element?: BrowserTreeItem
  ): vscode.ProviderResult<BrowserTreeItem[]> {
    return !element && this.device ? [this.device] : [];
  }

  public setDevice(device: Device) {
    this.device = new DeviceTreeItem(device);
    this._onDidChangeTreeData.fire();
  }
}
