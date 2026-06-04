import { mkdir, rename, writeFile, readFile, access } from "fs/promises";
import path from "path";
import { validatePdfUpload, UploadValidationError } from "@/lib/uploads/validate-pdf";
import { PDF_UPLOAD_MAX_BYTES } from "@/lib/uploads/constants";
import {
  resolveStoragePath,
  sanitizeDisplayFileName,
  sanitizeStorageToken,
} from "@/lib/storage/paths";
import { normalizeCuid } from "@/lib/storage/ids";

/** Only keys written by this module may be read from disk. */
const FINAL_BILL_KEY = /^[a-z0-9]{24}\/bill\.pdf$/i;
const PENDING_BILL_KEY = /^pending\/[a-zA-Z0-9_-]+\.pdf$/;

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "stock-bills");
const PENDING_DIR = path.join(UPLOAD_ROOT, "pending");

export { UploadValidationError, PDF_UPLOAD_MAX_BYTES };

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

/** Pending upload keys must stay under pending/ and end with .pdf */
export function assertPendingBillKey(relativeKey: string) {
  const normalized = relativeKey.replace(/\\/g, "/").trim();
  if (!normalized.startsWith("pending/") || !normalized.endsWith(".pdf")) {
    throw new Error("Invalid pending bill reference");
  }
  resolveStoragePath(UPLOAD_ROOT, normalized);
  return normalized;
}

export async function savePendingStockBill(userId: string, file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  validatePdfUpload(file, buffer);

  const safeName = sanitizeDisplayFileName(file.name, "bill.pdf");
  const token = `${sanitizeStorageToken(userId, 24)}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const relative = path.join("pending", `${token}.pdf`);

  await ensureDir(PENDING_DIR);
  const absolute = resolveStoragePath(UPLOAD_ROOT, relative);
  await writeFile(absolute, buffer);

  return {
    billPdfUrl: relative.replace(/\\/g, "/"),
    billFileName: safeName,
  };
}

export function resolveStockBillPath(relativeUrl: string) {
  return resolveStoragePath(UPLOAD_ROOT, relativeUrl);
}

export async function finalizeStockBill(
  pendingRelative: string | null | undefined,
  entryId: string,
  originalFileName?: string | null
): Promise<{ billPdfUrl: string | null; billFileName: string | null }> {
  if (!pendingRelative?.trim()) {
    return { billPdfUrl: null, billFileName: null };
  }

  const entryKey = normalizeCuid(entryId);
  if (!entryKey) {
    throw new Error("Invalid stock entry id");
  }

  const pendingKey = assertPendingBillKey(pendingRelative);
  const pendingPath = resolveStockBillPath(pendingKey);

  try {
    await access(pendingPath);
  } catch {
    throw new Error("Uploaded bill file not found. Please upload again.");
  }

  const destRelative = path.join(entryKey, "bill.pdf").replace(/\\/g, "/");
  resolveStockBillPath(destRelative);
  const destPath = resolveStockBillPath(destRelative);

  await ensureDir(path.dirname(destPath));
  await rename(pendingPath, destPath);

  return {
    billPdfUrl: destRelative,
    billFileName: sanitizeDisplayFileName(originalFileName ?? "", "bill.pdf"),
  };
}

export function assertStockBillStorageKey(relativeUrl: string) {
  const normalized = relativeUrl.replace(/\\/g, "/").replace(/\0/g, "").trim();
  if (!FINAL_BILL_KEY.test(normalized) && !PENDING_BILL_KEY.test(normalized)) {
    throw new Error("Invalid bill storage reference");
  }
  resolveStoragePath(UPLOAD_ROOT, normalized);
  return normalized;
}

export async function readStockBill(relativeUrl: string) {
  const key = assertStockBillStorageKey(relativeUrl);
  const absolute = resolveStockBillPath(key);
  await access(absolute);
  return readFile(absolute);
}
