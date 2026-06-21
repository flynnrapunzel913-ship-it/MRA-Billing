import { toJsonNumber } from "@/lib/serialize-prisma";

export type CollectionDiffValues = {
  notes: string | null;
  collectedByName: string | null;
  totalRevenue: number | null;
  invoiceRevenue: number | null;
  subscriptionRevenue: number | null;
  productRevenue: number | null;
  casualSwimRevenue: number | null;
  lastCouponAbove5: number | null;
  lastCouponBelow5: number | null;
  casualSwimCouponsAbove5: number | null;
  casualSwimCouponsBelow5: number | null;
  casualSwimRevenueAbove5: number | null;
  casualSwimRevenueBelow5: number | null;
  casualSwimCashCollected: number | null;
  casualSwimUpiCollected: number | null;
  totalExpenses: number | null;
  cashCollected: number | null;
  upiCollected: number | null;
  cardCollected: number | null;
  otherCollected: number | null;
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
  invoiceRevenue: "Invoice Revenue",
  subscriptionRevenue: "Subscription Revenue",
  productRevenue: "Product Revenue",
  casualSwimRevenue: "Casual Swimming Revenue",
  lastCouponAbove5: "Today's Last Coupon (Above 5 Years)",
  lastCouponBelow5: "Today's Last Coupon (Below 5 Years)",
  casualSwimCouponsAbove5: "Coupons Used (Above 5 Years)",
  casualSwimCouponsBelow5: "Coupons Used (Below 5 Years)",
  casualSwimRevenueAbove5: "Revenue (Above 5 Years)",
  casualSwimRevenueBelow5: "Revenue (Below 5 Years)",
  casualSwimCashCollected: "Casual Swimming Cash Collected",
  casualSwimUpiCollected: "Casual Swimming UPI Collected",
  totalExpenses: "Expenses",
  cashCollected: "Cash Collected",
  upiCollected: "UPI Collected",
  cardCollected: "Card Collected",
  otherCollected: "Other Collected",
  netCollection: "Net Collection",
  cashCountedPhysical: "Physical Cash Counted",
  cashDifference: "Cash Difference",
  cashDifferenceNotes: "Cash Difference Notes",
};

type CollectionRecordLike = {
  notes: string | null;
  collectedByName: string | null;
  totalRevenue: unknown;
  invoiceRevenue?: unknown;
  subscriptionRevenue: unknown;
  productRevenue: unknown;
  casualSwimRevenue?: unknown;
  lastCouponAbove5?: number | null;
  lastCouponBelow5?: number | null;
  casualSwimCouponsAbove5?: number | null;
  casualSwimCouponsBelow5?: number | null;
  casualSwimRevenueAbove5?: unknown;
  casualSwimRevenueBelow5?: unknown;
  casualSwimCashCollected?: unknown;
  casualSwimUpiCollected?: unknown;
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
    invoiceRevenue: toNullableNumber(record.invoiceRevenue),
    subscriptionRevenue: toNullableNumber(record.subscriptionRevenue),
    productRevenue: toNullableNumber(record.productRevenue),
    casualSwimRevenue: toNullableNumber(record.casualSwimRevenue),
    lastCouponAbove5: record.lastCouponAbove5 ?? null,
    lastCouponBelow5: record.lastCouponBelow5 ?? null,
    casualSwimCouponsAbove5:
      record.casualSwimCouponsAbove5 == null ? null : Number(record.casualSwimCouponsAbove5),
    casualSwimCouponsBelow5:
      record.casualSwimCouponsBelow5 == null ? null : Number(record.casualSwimCouponsBelow5),
    casualSwimRevenueAbove5: toNullableNumber(record.casualSwimRevenueAbove5),
    casualSwimRevenueBelow5: toNullableNumber(record.casualSwimRevenueBelow5),
    casualSwimCashCollected: toNullableNumber(record.casualSwimCashCollected),
    casualSwimUpiCollected: toNullableNumber(record.casualSwimUpiCollected),
    totalExpenses: toNullableNumber(record.totalExpenses),
    cashCollected: toNullableNumber(record.cashCollectedSystem),
    upiCollected: toNullableNumber(record.upiCollected),
    cardCollected: null,
    otherCollected: null,
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

export function buildOriginalSnapshotJson(values: CollectionDiffValues) {
  return {
    totalRevenue: values.totalRevenue,
    invoiceRevenue: values.invoiceRevenue,
    totalExpenses: values.totalExpenses,
    cashCollected: values.cashCollected,
    upiCollected: values.upiCollected,
    cardCollected: values.cardCollected,
    otherCollected: values.otherCollected,
    netCollection: values.netCollection,
    subscriptionRevenue: values.subscriptionRevenue,
    productRevenue: values.productRevenue,
    casualSwimRevenue: values.casualSwimRevenue,
    lastCouponAbove5: values.lastCouponAbove5,
    lastCouponBelow5: values.lastCouponBelow5,
    casualSwimCouponsAbove5: values.casualSwimCouponsAbove5,
    casualSwimCouponsBelow5: values.casualSwimCouponsBelow5,
    casualSwimRevenueAbove5: values.casualSwimRevenueAbove5,
    casualSwimRevenueBelow5: values.casualSwimRevenueBelow5,
    casualSwimCashCollected: values.casualSwimCashCollected,
    casualSwimUpiCollected: values.casualSwimUpiCollected,
    notes: values.notes,
    collectedByName: values.collectedByName,
  };
}

export type OriginalSnapshotJson = ReturnType<typeof buildOriginalSnapshotJson>;
