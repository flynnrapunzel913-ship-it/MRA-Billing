import { toJsonNumber } from "@/lib/serialize-prisma";

/** Keys stored in changesJson / originalSnapshotJson */
export type CollectionDiffValues = {
  notes: string | null;
  collectedByName: string | null;
  totalRevenue: number | null;
  subscriptionRevenue: number | null;
  productRevenue: number | null;
  totalExpenses: number | null;
  cashCollected: number | null;
  upiCollected: number | null;
  netCollection: number | null;
  cashCountedPhysical: number | null;
  cashDifference: number | null;
  cashDifferenceNotes: string | null;
};

export type CollectionFieldChange = {
  old: string | number | null;
  new: string | number | null;
};

export type CollectionChangesJson = Partial<
  Record<keyof CollectionDiffValues, CollectionFieldChange>
>;

export const COLLECTION_FIELD_LABELS: Record<keyof CollectionDiffValues, string> = {
  notes: "Notes",
  collectedByName: "Collected By",
  totalRevenue: "Revenue",
  subscriptionRevenue: "Subscription Revenue",
  productRevenue: "Product Revenue",
  totalExpenses: "Expenses",
  cashCollected: "Cash Collected",
  upiCollected: "UPI Collected",
  netCollection: "Net Collection",
  cashCountedPhysical: "Physical Cash Counted",
  cashDifference: "Cash Difference",
  cashDifferenceNotes: "Cash Difference Notes",
};

type CollectionRecordLike = {
  notes: string | null;
  collectedByName: string | null;
  totalRevenue: unknown;
  subscriptionRevenue: unknown;
  productRevenue: unknown;
  totalExpenses: unknown;
  cashCollectedSystem: unknown;
  upiCollected: unknown;
  netCollection: unknown;
  cashCountedPhysical: unknown;
  cashDifference: unknown;
  cashDifferenceNotes: string | null;
};

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return toJsonNumber(value);
}

export function extractCollectionDiffValues(
  record: CollectionRecordLike
): CollectionDiffValues {
  return {
    notes: record.notes,
    collectedByName: record.collectedByName,
    totalRevenue: toNullableNumber(record.totalRevenue),
    subscriptionRevenue: toNullableNumber(record.subscriptionRevenue),
    productRevenue: toNullableNumber(record.productRevenue),
    totalExpenses: toNullableNumber(record.totalExpenses),
    cashCollected: toNullableNumber(record.cashCollectedSystem),
    upiCollected: toNullableNumber(record.upiCollected),
    netCollection: toNullableNumber(record.netCollection),
    cashCountedPhysical: toNullableNumber(record.cashCountedPhysical),
    cashDifference: toNullableNumber(record.cashDifference),
    cashDifferenceNotes: record.cashDifferenceNotes,
  };
}

function valuesEqual(
  a: string | number | null | undefined,
  b: string | number | null | undefined
): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 0.005;
  }
  return String(a ?? "") === String(b ?? "");
}

export function buildCollectionChangesJson(
  before: CollectionDiffValues,
  after: CollectionDiffValues
): CollectionChangesJson {
  const changes: CollectionChangesJson = {};

  for (const key of Object.keys(COLLECTION_FIELD_LABELS) as (keyof CollectionDiffValues)[]) {
    const oldVal = before[key];
    const newVal = after[key];
    if (!valuesEqual(oldVal, newVal)) {
      changes[key] = { old: oldVal, new: newVal };
    }
  }

  return changes;
}

export function hasCollectionChanges(changes: CollectionChangesJson): boolean {
  return Object.keys(changes).length > 0;
}

/** Compact snapshot persisted on first mark-collected for Version 0. */
export function buildOriginalSnapshotJson(values: CollectionDiffValues) {
  return {
    totalRevenue: values.totalRevenue,
    totalExpenses: values.totalExpenses,
    cashCollected: values.cashCollected,
    upiCollected: values.upiCollected,
    netCollection: values.netCollection,
    subscriptionRevenue: values.subscriptionRevenue,
    productRevenue: values.productRevenue,
    notes: values.notes,
    collectedByName: values.collectedByName,
  };
}

export type OriginalSnapshotJson = ReturnType<typeof buildOriginalSnapshotJson>;
