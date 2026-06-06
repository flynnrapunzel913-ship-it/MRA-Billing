import { localStorageProvider } from "@/lib/storage/local-storage-provider";
import { r2StorageProvider } from "@/lib/storage/r2-storage-provider";

export type BillSaveResult = {
  billPdfUrl: string;
  billFileName: string;
};

export type BillFinalizeResult = {
  billPdfUrl: string | null;
  billFileName: string | null;
};

export type StorageProvider = {
  savePendingBill(userId: string, file: File): Promise<BillSaveResult>;
  finalizeBill(
    pendingRelative: string | null | undefined,
    entryId: string,
    originalFileName?: string | null
  ): Promise<BillFinalizeResult>;
  readBill(relativeUrl: string): Promise<Buffer>;
  deleteBill(relativeKey: string): Promise<void>;
  billExists(relativeKey: string): Promise<boolean>;
};

export type StorageDriver = "local" | "r2";

let cachedProvider: StorageProvider | null = null;

/** `STORAGE_DRIVER=local|r2` — defaults to `local` when unset or unknown. */
export function resolveStorageDriver(): StorageDriver {
  const raw = process.env.STORAGE_DRIVER?.trim().toLowerCase();
  if (raw === "r2") return "r2";
  return "local";
}

export function getStorageProvider(): StorageProvider {
  if (cachedProvider) return cachedProvider;

  cachedProvider =
    resolveStorageDriver() === "r2" ? r2StorageProvider : localStorageProvider;

  return cachedProvider;
}

export { localStorageProvider, r2StorageProvider };
