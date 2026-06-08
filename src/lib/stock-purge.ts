import { prisma } from "@/lib/prisma";
import { deleteStockBillStorage } from "@/lib/storage/stock-bills";
import { deleteStockBill } from "@/lib/stock-storage";

/** Remove bill files from storage (local dir + provider key). Idempotent. */
export async function purgeStockBillFiles(
  entryId: string,
  billPdfUrl?: string | null
): Promise<void> {
  if (billPdfUrl?.trim()) {
    try {
      await deleteStockBill(billPdfUrl);
    } catch {
      /* file may already be removed */
    }
  }
  await deleteStockBillStorage(entryId, billPdfUrl);
}

/** Hard-delete a soft-deleted stock row and remove associated bill storage. */
export async function permanentlyDeleteStockEntry(entry: {
  id: string;
  billPdfUrl: string | null;
}): Promise<void> {
  await prisma.stockEntry.delete({ where: { id: entry.id } });
  await purgeStockBillFiles(entry.id, entry.billPdfUrl);
}
