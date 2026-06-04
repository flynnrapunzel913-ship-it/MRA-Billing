/**
 * @deprecated Import from @/lib/storage/stock-bills — re-export for legacy callers.
 */
export {
  savePendingStockBill,
  resolveStockBillPath,
  finalizeStockBill,
  readStockBill,
  assertPendingBillKey,
  assertStockBillStorageKey,
  UploadValidationError,
  PDF_UPLOAD_MAX_BYTES,
} from "@/lib/storage/stock-bills";
