import * as vscode from "vscode";
import { Device, SlotInfo } from "../device";
import { ProgramSlotTreeItem } from "../Ri5devBrowser";
import { decodeBase64 } from "../utils";

export type SlotType = "all" | "empty" | "full";

export async function askSlotFromList(device: Device, slotType: SlotType) {
  return new Promise<ProgramSlotTreeItem | undefined>(
    async (resolve, reject) => {
      const slots = await device.listSlots();
      if (slots === undefined) {
        reject(
          "Device storage info not loaded... Please, reconnect your device"
        );
        return;
      }

      const list = [...Array(20).keys()]
        .filter((i) => {
          if (slotType === "all") {
            return true;
          } else if (slotType === "full") {
            return slots[i];
          } else {
            return !slots[i];
          }
        })
        .map((i) => {
          const slotTreeItem = new ProgramSlotTreeItem(i, slots[i]);
          return slotTreeItem.label!;
        });
      const selected = await vscode.window.showQuickPick(list, {
        ignoreFocusOut: true,
        placeHolder: "Select a slot or press ESC to cancel",
      });
      if (selected) {
        const index = parseInt(selected.split(".")[0]);
        resolve(new ProgramSlotTreeItem(index, slots[index]));
        return;
      }
      resolve(undefined);
    }
  );
}
