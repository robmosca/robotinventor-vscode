import * as vscode from "vscode";
import * as path from "path";

class DeviceTreeItem extends vscode.TreeItem {
  constructor(
    public readonly deviceName: string,
    public readonly firmwareVersion: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(deviceName, collapsibleState);
    this.tooltip = deviceName;
    this.description = this.firmwareVersion;
  }

  iconPath = {
    light: path.join(__filename, "..", "resources", "light", "device.svg"),
    dark: path.join(__filename, "..", "resources", "dark", "device.svg"),
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

export class Ri5devBrowserProvider
  implements vscode.TreeDataProvider<DeviceTreeItem> {
  private device: DeviceTreeItem;
  private readonly noDeviceTreeItem = new CommandTreeItem(
    "Click here to connect to a device",
    "ri5devBrowser.action.pickDevice"
  );

  constructor() {
    this.device = new DeviceTreeItem(
      "Test",
      "0.0.1",
      vscode.TreeItemCollapsibleState.Collapsed
    );
  }

  public getTreeItem(element: DeviceTreeItem): vscode.TreeItem {
    return element;
  }

  public getChildren(
    element?: DeviceTreeItem
  ): vscode.ProviderResult<DeviceTreeItem[]> {
    if (!element) {
      return [this.device];
    }
    return [];
  }
}
