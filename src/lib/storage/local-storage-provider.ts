import { access, unlink } from "fs/promises";
import {
  assertStockBillStorageKey,
  finalizeStockBill,
  readStockBill,
  resolveStockBillPath,
  savePendingStockBill,
} from "@/lib/storage/stock-bills";
import type { StorageProvider } from "@/lib/storage/storage-provider";

export const localStorageProvider: StorageProvider = {
  savePendingBill: savePendingStockBill,
  finalizeBill: finalizeStockBill,
  readBill: readStockBill,

  async deleteBill(relativeKey: string): Promise<void> {
    const key = assertStockBillStorageKey(relativeKey);
    const absolute = resolveStockBillPath(key);
    await unlink(absolute);
  },

  async billExists(relativeKey: string): Promise<boolean> {
    try {
      const key = assertStockBillStorageKey(relativeKey);
      const absolute = resolveStockBillPath(key);
      await access(absolute);
      return true;
    } catch {
      return false;
    }
  },
};
