import * as vscode from 'vscode';
import * as path from 'path';
import {
  SlotInfo,
  addDeviceOnChangeCallbak,
  getDeviceInfo,
  getDeviceSlots,
  removeDeviceAllListeners,
} from './device';
import { decodeBase64, formatFilesize } from './utils';

export class DeviceTreeItem extends vscode.TreeItem {
  constructor() {
    const { name, firmwareVersion } = getDeviceInfo();
    super(name, vscode.TreeItemCollapsibleState.Collapsed);
    this.tooltip = name;
    this.description = firmwareVersion || 'No version available';
    this.contextValue = 'device';
    this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
  }

  iconPath = {
    light: path.join(__dirname, '..', 'resources', 'light', 'device.svg'),
    dark: path.join(__dirname, '..', 'resources', 'dark', 'device.svg'),
  };

  refresh(): void {
    const { name, firmwareVersion } = getDeviceInfo();
    this.label = name;
    this.tooltip = name;
    this.description = firmwareVersion;
  }
}

export class ProgramSlotTreeItem extends vscode.TreeItem {
  index: number;
  slot: SlotInfo | undefined;

  constructor(index: number, slot?: SlotInfo) {
    const name = slot ? decodeBase64(slot.name) : '';
    const label = `${index}. ${name}`.trim();
    super(label, vscode.TreeItemCollapsibleState.None);
    this.index = index;
    this.tooltip = slot ? name : 'Empty';
    this.description = slot ? formatFilesize(slot.size) : 'Empty';
    this.contextValue = slot ? 'fullProgramSlot' : 'emptyProgramSlot';
  }
}

export class CommandTreeItem extends vscode.TreeItem {
  constructor(label: string, command?: string) {
    super(label);
    if (command) {
      this.command = {
        command: command,
        title: '',
      };
    }
  }
}

type BrowserTreeItem = DeviceTreeItem | ProgramSlotTreeItem | CommandTreeItem;

export class Ri5devBrowserProvider
  implements vscode.TreeDataProvider<BrowserTreeItem>
{
  private device: DeviceTreeItem | undefined;
  private _onDidChangeTreeData: vscode.EventEmitter<
    BrowserTreeItem | undefined | null | void
  > = new vscode.EventEmitter<BrowserTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    BrowserTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  getTreeItem(element: DeviceTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(
    element?: BrowserTreeItem,
  ): vscode.ProviderResult<BrowserTreeItem[]> {
    if (!element) {
      return this.device ? [this.device] : [];
    } else if (element === this.device) {
      const slots = getDeviceSlots() ?? [];
      return [...Array(20).keys()].map(
        (i) => new ProgramSlotTreeItem(i, slots[i]),
      );
    } else {
      return [];
    }
  }

  refreshDevice() {
    this.device = new DeviceTreeItem();
    addDeviceOnChangeCallbak(() => {
      this.device?.refresh();
      this._onDidChangeTreeData.fire();
    });
    this._onDidChangeTreeData.fire();
  }

  clearDevice() {
    removeDeviceAllListeners();
    this.device = undefined;
    this._onDidChangeTreeData.fire();
  }
}
