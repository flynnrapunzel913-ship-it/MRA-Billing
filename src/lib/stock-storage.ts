import { mkdir, rename, writeFile, readFile, access } from "fs/promises";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "stock-bills");
const PENDING_DIR = path.join(UPLOAD_ROOT, "pending");
const MAX_BYTES = 10 * 1024 * 1024;

export function isPdfFile(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".pdf") && (file.type === "application/pdf" || file.type === "");
}

export function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "bill.pdf";
}

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

export async function savePendingStockBill(userId: string, file: File) {
  if (!isPdfFile(file)) {
    throw new Error("Only PDF files are allowed");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("PDF must be 10 MB or smaller");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = sanitizeFileName(file.name);
  const token = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const relative = path.join("pending", `${token}.pdf`);

  await ensureDir(PENDING_DIR);
  const absolute = path.join(UPLOAD_ROOT, relative);
  await writeFile(absolute, buffer);

  return {
    billPdfUrl: relative.replace(/\\/g, "/"),
    billFileName: safeName,
  };
}

export function resolveStockBillPath(relativeUrl: string) {
  const normalized = relativeUrl.replace(/\\/g, "/");
  if (normalized.includes("..")) {
    throw new Error("Invalid file path");
  }
  const absolute = path.join(UPLOAD_ROOT, normalized);
  if (!absolute.startsWith(UPLOAD_ROOT)) {
    throw new Error("Invalid file path");
  }
  return absolute;
}

export async function finalizeStockBill(
  pendingRelative: string | null | undefined,
  entryId: string,
  originalFileName?: string | null
): Promise<{ billPdfUrl: string | null; billFileName: string | null }> {
  if (!pendingRelative?.trim()) {
    return { billPdfUrl: null, billFileName: null };
  }

  const pendingPath = resolveStockBillPath(pendingRelative);
  try {
    await access(pendingPath);
  } catch {
    throw new Error("Uploaded bill file not found. Please upload again.");
  }

  const destDir = path.join(UPLOAD_ROOT, entryId);
  await ensureDir(destDir);
  const destRelative = path.join(entryId, "bill.pdf").replace(/\\/g, "/");
  const destPath = path.join(UPLOAD_ROOT, destRelative);

  await rename(pendingPath, destPath);
  return {
    billPdfUrl: destRelative,
    billFileName: originalFileName?.trim() || "bill.pdf",
  };
}

export async function readStockBill(relativeUrl: string) {
  const absolute = resolveStockBillPath(relativeUrl);
  await access(absolute);
  return readFile(absolute);
}
