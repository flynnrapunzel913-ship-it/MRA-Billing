/**
 * Stock bill storage — delegates to StorageProvider (local filesystem or R2).
 * @see src/lib/storage/storage-provider.ts
 */
import { getStorageProvider } from "@/lib/storage/storage-provider";

export {
  assertPendingBillKey,
  assertStockBillStorageKey,
  resolveStockBillPath,
  UploadValidationError,
  PDF_UPLOAD_MAX_BYTES,
} from "@/lib/storage/stock-bills";

export async function savePendingStockBill(userId: string, file: File) {
  return getStorageProvider().savePendingBill(userId, file);
}

export async function finalizeStockBill(
  pendingRelative: string | null | undefined,
  entryId: string,
  originalFileName?: string | null
) {
  return getStorageProvider().finalizeBill(pendingRelative, entryId, originalFileName);
}

export async function readStockBill(relativeUrl: string) {
  const buffer = await getStorageProvider().readBill(relativeUrl);
  // Uint8Array satisfies NextResponse BodyInit (Buffer alone does not in strict TS).
  return new Uint8Array(buffer);
}

export async function deleteStockBill(relativeKey: string) {
  return getStorageProvider().deleteBill(relativeKey);
}

export async function stockBillExists(relativeKey: string) {
  return getStorageProvider().billExists(relativeKey);
}
