import * as vscode from "vscode";
import * as path from "path";
import { Device } from "./device";
import { on } from "process";

class DeviceTreeItem extends vscode.TreeItem {
  constructor(public device: Device) {
    super(device?.name, vscode.TreeItemCollapsibleState.None);
  }

  iconPath = {
    light: path.join(__dirname, "..", "resources", "light", "device.svg"),
    dark: path.join(__dirname, "..", "resources", "dark", "device.svg"),
  };

  refresh() {
    this.label = this.device?.name;
    this.tooltip = this.device?.name;
    this.description = this.device?.firmwareVersion;
  }
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
    device.on("change", () => {
      this.device?.refresh();
      this._onDidChangeTreeData.fire();
    });

    this._onDidChangeTreeData.fire();
  }

  public clearDevice() {
    this.device = undefined;
    this._onDidChangeTreeData.fire();
  }
}
