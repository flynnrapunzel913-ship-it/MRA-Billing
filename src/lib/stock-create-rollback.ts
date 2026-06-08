import { prisma } from "@/lib/prisma";
import { purgeStockBillFiles } from "@/lib/stock-purge";
import { deleteStockBill } from "@/lib/stock-storage";

/** Remove a pending bill upload (local or R2). Idempotent. */
export async function cleanupPendingStockBill(pendingBillUrl?: string | null): Promise<void> {
  if (!pendingBillUrl?.trim()) return;
  try {
    await deleteStockBill(pendingBillUrl);
  } catch {
    /* file may already be removed */
  }
}

/**
 * Undo a stock row created when bill attachment fails after the DB transaction committed.
 * Removes the entry (StockActivity rows cascade) and any associated bill storage.
 */
export async function rollbackStockCreateAfterBillFailure(
  entryId: string,
  options?: {
    pendingBillUrl?: string | null;
    finalizedBillPdfUrl?: string | null;
  }
): Promise<void> {
  try {
    await prisma.stockEntry.delete({ where: { id: entryId } });
  } catch (error) {
    console.error(
      "[stock-create] Failed to roll back stock entry after bill failure:",
      error instanceof Error ? error.message : error
    );
  }

  await purgeStockBillFiles(entryId, options?.finalizedBillPdfUrl ?? null);
  await cleanupPendingStockBill(options?.pendingBillUrl);
}
