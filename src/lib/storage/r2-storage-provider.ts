import path from "path";
import { validatePdfUpload } from "@/lib/uploads/validate-pdf";
import { sanitizeDisplayFileName, sanitizeStorageToken } from "@/lib/storage/paths";
import { normalizeCuid } from "@/lib/storage/ids";
import {
  assertPendingBillKey,
  assertPendingBillOwnedBy,
  assertStockBillStorageKey,
} from "@/lib/storage/stock-bills";
import {
  copyObject,
  deleteObject,
  getObjectBuffer,
  objectExists,
  uploadObject,
} from "@/lib/storage/r2";
import type { StorageProvider } from "@/lib/storage/storage-provider";

const PDF_CONTENT_TYPE = "application/pdf";

export const r2StorageProvider: StorageProvider = {
  async savePendingBill(userId: string, file: File) {
    const buffer = Buffer.from(await file.arrayBuffer());
    validatePdfUpload(file, buffer);

    const safeName = sanitizeDisplayFileName(file.name, "bill.pdf");
    const token = `${sanitizeStorageToken(userId, 24)}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    const relative = path.join("pending", `${token}.pdf`).replace(/\\/g, "/");

    await uploadObject(relative, buffer, PDF_CONTENT_TYPE);

    return {
      billPdfUrl: relative,
      billFileName: safeName,
    };
  },

  async finalizeBill(
    pendingRelative: string | null | undefined,
    entryId: string,
    originalFileName?: string | null,
    uploadedByUserId?: string | null
  ) {
    if (!pendingRelative?.trim()) {
      return { billPdfUrl: null, billFileName: null };
    }

    const entryKey = normalizeCuid(entryId);
    if (!entryKey) {
      throw new Error("Invalid stock entry id");
    }

    const pendingKey = uploadedByUserId
      ? assertPendingBillOwnedBy(pendingRelative, uploadedByUserId)
      : assertPendingBillKey(pendingRelative);
    if (!(await objectExists(pendingKey))) {
      throw new Error("Uploaded bill file not found. Please upload again.");
    }

    const destRelative = path.join(entryKey, "bill.pdf").replace(/\\/g, "/");
    await copyObject(pendingKey, destRelative);
    await deleteObject(pendingKey);

    return {
      billPdfUrl: destRelative,
      billFileName: sanitizeDisplayFileName(originalFileName ?? "", "bill.pdf"),
    };
  },

  async readBill(relativeUrl: string) {
    const key = assertStockBillStorageKey(relativeUrl);
    return getObjectBuffer(key);
  },

  async deleteBill(relativeKey: string) {
    const key = assertStockBillStorageKey(relativeKey);
    await deleteObject(key);
  },

  async billExists(relativeKey: string) {
    try {
      const key = assertStockBillStorageKey(relativeKey);
      return objectExists(key);
    } catch {
      return false;
    }
  },
};
