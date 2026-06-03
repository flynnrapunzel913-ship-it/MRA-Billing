import { toJsonNumber } from "@/lib/serialize-prisma";

export function formatStockNumber(year: number, sequence: number) {
  return `STK-${year}-${String(sequence).padStart(5, "0")}`;
}

export type StockEntryLike = {
  totalCost: unknown;
  quantityPurchased: number;
  purchaseDate: Date | string;
  createdAt?: Date | string;
  [key: string]: unknown;
};

export function serializeStockForJson<T extends StockEntryLike>(entry: T) {
  return {
    ...entry,
    totalCost: toJsonNumber(entry.totalCost),
    purchaseDate:
      entry.purchaseDate instanceof Date
        ? entry.purchaseDate.toISOString()
        : entry.purchaseDate,
    createdAt:
      entry.createdAt instanceof Date ? entry.createdAt.toISOString() : entry.createdAt,
    updatedAt:
      "updatedAt" in entry && entry.updatedAt instanceof Date
        ? entry.updatedAt.toISOString()
        : entry.updatedAt,
  };
}

export function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function getTodayRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { start, end };
}
