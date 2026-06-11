import { endOfDay, format, parseISO, startOfDay, subDays } from "date-fns";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveInvoiceWhere } from "@/lib/invoice-filters";
import { COACHING_PACKAGE_TYPE } from "@/lib/constants";
import { toJsonNumber } from "@/lib/serialize-prisma";
import { normalizeDenominations, type CashDenominations } from "@/lib/cash-denominations";

export type RevenueSourceRow = {
  name: string;
  count: number;
  amount: number;
};

export type ExpenseDetailRow = {
  id: string;
  expenseDate: string;
  paidTo: string;
  reason: string;
  amount: number;
  createdBy: string;
  createdAt: string;
};

export type PaymentBreakdown = {
  cash: number;
  upi: number;
  card: number;
  other: number;
  /** Gross payments received (all methods, before expenses). */
  grossCollected: number;
  /** Cash remaining after same-day expenses (expenses assumed paid from cash). */
  netCash: number;
  /** UPI collected (expenses are not deducted from UPI). */
  netUpi: number;
};

export type CashReconciliation = {
  cashCollectedSystem: number;
  cashCountedPhysical: number;
  cashDifference: number;
  cashDifferenceNotes: string | null;
  cashDenominations: CashDenominations;
};

export type CollectionSnapshot = {
  totalRevenue: number;
  subscriptionRevenue: number;
  productRevenue: number;
  totalExpenses: number;
  cashCollected: number;
  upiCollected: number;
  netCollection: number;
};

export type CollectionRecord = {
  id: string;
  notes: string | null;
  collectedAt: string;
  collectedByName: string | null;
  collectedBy: { id: string; name: string; username: string };
  snapshot: CollectionSnapshot | null;
  cashReconciliation: CashReconciliation | null;
};

export type CollectionHistoryRow = {
  date: string;
  label: string;
  collected: boolean;
  snapshot: CollectionSnapshot | null;
  cashReconciliation: CashReconciliation | null;
};

export type DailyCollectionSheet = {
  date: string;
  isSnapshot: boolean;
  totalRevenue: number;
  subscriptionRevenue: number;
  productRevenue: number;
  revenueBreakdown: RevenueSourceRow[];
  totalExpenses: number;
  expenses: ExpenseDetailRow[];
  paymentBreakdown: PaymentBreakdown;
  netCollection: number;
  collection: CollectionRecord | null;
  recentHistory: CollectionHistoryRow[];
};

export function parseCollectionDateInput(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const parsed = parseISO(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
}

function serializeCashReconciliation(row: {
  cashCollectedSystem: unknown;
  cashCountedPhysical: unknown;
  cashDifference: unknown;
  cashDifferenceNotes: string | null;
  cashDenominations: unknown;
}): CashReconciliation | null {
  if (row.cashCollectedSystem == null && row.cashCountedPhysical == null) {
    return null;
  }
  return {
    cashCollectedSystem: toJsonNumber(row.cashCollectedSystem),
    cashCountedPhysical: toJsonNumber(row.cashCountedPhysical),
    cashDifference: toJsonNumber(row.cashDifference),
    cashDifferenceNotes: row.cashDifferenceNotes,
    cashDenominations: normalizeDenominations(row.cashDenominations),
  };
}

function serializeSnapshot(row: {
  totalRevenue: unknown;
  subscriptionRevenue: unknown;
  productRevenue: unknown;
  totalExpenses: unknown;
  cashCollectedSystem: unknown;
  upiCollected: unknown;
  netCollection: unknown;
}): CollectionSnapshot | null {
  if (row.totalRevenue == null) return null;
  return {
    totalRevenue: toJsonNumber(row.totalRevenue),
    subscriptionRevenue: toJsonNumber(row.subscriptionRevenue),
    productRevenue: toJsonNumber(row.productRevenue),
    totalExpenses: toJsonNumber(row.totalExpenses),
    cashCollected: toJsonNumber(row.cashCollectedSystem),
    upiCollected: toJsonNumber(row.upiCollected),
    netCollection: toJsonNumber(row.netCollection),
  };
}

/** Pure collection math — used by the daily sheet and unit tests. */
export function computeCollectionTotals(input: {
  subscriptionRevenue: number;
  productRevenue: number;
  grossCash: number;
  grossUpi: number;
  grossCard: number;
  grossOther: number;
  totalExpenses: number;
}): {
  totalRevenue: number;
  totalExpenses: number;
  netCollection: number;
  paymentBreakdown: PaymentBreakdown;
} {
  const grossCollected =
    input.grossCash + input.grossUpi + input.grossCard + input.grossOther;
  const itemRevenue = input.subscriptionRevenue + input.productRevenue;
  const totalRevenue = grossCollected > 0 ? grossCollected : itemRevenue;
  const netCash = input.grossCash - input.totalExpenses;
  const netUpi = input.grossUpi;
  const netCollection = totalRevenue - input.totalExpenses;

  return {
    totalRevenue,
    totalExpenses: input.totalExpenses,
    netCollection,
    paymentBreakdown: {
      cash: input.grossCash,
      upi: input.grossUpi,
      card: input.grossCard,
      other: input.grossOther,
      grossCollected,
      netCash,
      netUpi,
    },
  };
}

function buildPaymentBreakdown(
  paymentGroups: Array<{ paymentMethod: string; _sum: { amountPaid: unknown } }>,
  totalExpenses: number,
  subscriptionRevenue: number,
  productRevenue: number
): PaymentBreakdown {
  let grossCash = 0;
  let grossUpi = 0;
  let grossCard = 0;
  let grossOther = 0;

  for (const row of paymentGroups) {
    const amount = toJsonNumber(row._sum.amountPaid);
    switch (row.paymentMethod) {
      case "CASH":
        grossCash = amount;
        break;
      case "UPI":
        grossUpi = amount;
        break;
      case "CARD":
        grossCard = amount;
        break;
      default:
        grossOther += amount;
    }
  }

  return computeCollectionTotals({
    subscriptionRevenue,
    productRevenue,
    grossCash,
    grossUpi,
    grossCard,
    grossOther,
    totalExpenses,
  }).paymentBreakdown;
}

function buildSnapshotPaymentBreakdown(
  snapshot: CollectionSnapshot,
  liveCard: number,
  liveOther: number
): PaymentBreakdown {
  return computeCollectionTotals({
    subscriptionRevenue: snapshot.subscriptionRevenue,
    productRevenue: snapshot.productRevenue,
    grossCash: snapshot.cashCollected,
    grossUpi: snapshot.upiCollected,
    grossCard: liveCard,
    grossOther: liveOther,
    totalExpenses: snapshot.totalExpenses,
  }).paymentBreakdown;
}

export async function getDailyCollectionSheet(dateStr: string): Promise<DailyCollectionSheet | null> {
  const dayStart = parseCollectionDateInput(dateStr);
  if (!dayStart) return null;

  const dayEnd = endOfDay(dayStart);
  const invoiceWhere = await getActiveInvoiceWhere();

  const paidInvoiceWhere: Prisma.InvoiceWhereInput = {
    ...invoiceWhere,
    invoiceDate: { gte: dayStart, lte: dayEnd },
    paymentStatus: { in: ["FULLY_PAID", "PARTIALLY_PAID"] },
    amountPaid: { gt: 0 },
  };

  const expenseWhere = {
    expenseDate: { gte: dayStart, lte: dayEnd },
  };

  const historyStart = startOfDay(subDays(dayStart, 13));

  const [
    paymentGroups,
    coachingGroups,
    productGroups,
    expenseRows,
    collection,
    historyCollections,
  ] = await Promise.all([
    prisma.invoice.groupBy({
      by: ["paymentMethod"],
      where: paidInvoiceWhere,
      _sum: { amountPaid: true },
    }),
    prisma.invoiceItem.groupBy({
      by: ["description"],
      where: {
        itemType: COACHING_PACKAGE_TYPE,
        invoice: paidInvoiceWhere,
      },
      _sum: { amount: true, quantity: true },
    }),
    prisma.invoiceItem.groupBy({
      by: ["description"],
      where: {
        itemType: "Accessories / Products",
        invoice: paidInvoiceWhere,
      },
      _sum: { amount: true, quantity: true },
    }),
    prisma.expense.findMany({
      where: expenseWhere,
      orderBy: { createdAt: "asc" },
      include: {
        createdBy: { select: { name: true, username: true } },
      },
    }),
    prisma.dailyCollection.findUnique({
      where: { collectionDate: dayStart },
      include: {
        collectedBy: { select: { id: true, name: true, username: true } },
      },
    }),
    prisma.dailyCollection.findMany({
      where: { collectionDate: { gte: historyStart, lte: dayEnd } },
      select: {
        collectionDate: true,
        totalRevenue: true,
        subscriptionRevenue: true,
        productRevenue: true,
        totalExpenses: true,
        cashCollectedSystem: true,
        upiCollected: true,
        netCollection: true,
        cashCountedPhysical: true,
        cashDifference: true,
        cashDifferenceNotes: true,
        cashDenominations: true,
      },
      orderBy: { collectionDate: "desc" },
    }),
  ]);

  const subscriptionBreakdown: RevenueSourceRow[] = coachingGroups
    .map((row) => ({
      name: row.description?.trim() || "Coaching Package",
      count: toJsonNumber(row._sum.quantity),
      amount: toJsonNumber(row._sum.amount),
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const productBreakdown: RevenueSourceRow[] = productGroups
    .map((row) => ({
      name: row.description?.trim() || "Product",
      count: toJsonNumber(row._sum.quantity),
      amount: toJsonNumber(row._sum.amount),
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const liveSubscriptionRevenue = subscriptionBreakdown.reduce((s, r) => s + r.amount, 0);
  const liveProductRevenue = productBreakdown.reduce((s, r) => s + r.amount, 0);
  const liveTotalExpenses = expenseRows.reduce((sum, row) => sum + toJsonNumber(row.amount), 0);
  const livePaymentBreakdown = buildPaymentBreakdown(
    paymentGroups,
    liveTotalExpenses,
    liveSubscriptionRevenue,
    liveProductRevenue
  );
  const liveTotals = computeCollectionTotals({
    subscriptionRevenue: liveSubscriptionRevenue,
    productRevenue: liveProductRevenue,
    grossCash: livePaymentBreakdown.cash,
    grossUpi: livePaymentBreakdown.upi,
    grossCard: livePaymentBreakdown.card,
    grossOther: livePaymentBreakdown.other,
    totalExpenses: liveTotalExpenses,
  });
  const liveTotalRevenue = liveTotals.totalRevenue;
  const liveNetCollection = liveTotals.netCollection;
  const liveRevenueBreakdown = [...subscriptionBreakdown, ...productBreakdown];

  const expenses: ExpenseDetailRow[] = expenseRows.map((row) => ({
    id: row.id,
    expenseDate: row.expenseDate.toISOString(),
    paidTo: row.paidTo,
    reason: row.reason,
    amount: toJsonNumber(row.amount),
    createdBy: row.createdBy.name || row.createdBy.username,
    createdAt: row.createdAt.toISOString(),
  }));

  const collectionSnapshot = collection ? serializeSnapshot(collection) : null;
  const isSnapshot = collectionSnapshot != null;
  const displaySnapshot =
    collectionSnapshot != null
      ? {
          ...collectionSnapshot,
          cashCollected: livePaymentBreakdown.cash,
          upiCollected: livePaymentBreakdown.upi,
        }
      : null;

  const historyByDate = new Map(
    historyCollections.map((row) => {
      const key = format(startOfDay(row.collectionDate), "yyyy-MM-dd");
      return [
        key,
        {
          snapshot: serializeSnapshot(row),
          cash: serializeCashReconciliation(row),
        },
      ] as const;
    })
  );

  const recentHistory: CollectionHistoryRow[] = [];
  for (let i = 0; i < 14; i += 1) {
    const date = startOfDay(subDays(dayStart, i));
    const key = format(date, "yyyy-MM-dd");
    const entry = historyByDate.get(key);
    recentHistory.push({
      date: key,
      label: format(date, "d MMM yyyy"),
      collected: historyByDate.has(key),
      snapshot: entry?.snapshot ?? null,
      cashReconciliation: entry?.cash ?? null,
    });
  }

  return {
    date: dateStr,
    isSnapshot,
    totalRevenue: isSnapshot ? collectionSnapshot.totalRevenue : liveTotalRevenue,
    subscriptionRevenue: isSnapshot
      ? collectionSnapshot.subscriptionRevenue
      : liveSubscriptionRevenue,
    productRevenue: isSnapshot ? collectionSnapshot.productRevenue : liveProductRevenue,
    revenueBreakdown: liveRevenueBreakdown,
    totalExpenses: isSnapshot ? collectionSnapshot.totalExpenses : liveTotalExpenses,
    expenses,
    paymentBreakdown: isSnapshot
      ? buildSnapshotPaymentBreakdown(
          displaySnapshot!,
          livePaymentBreakdown.card,
          livePaymentBreakdown.other
        )
      : livePaymentBreakdown,
    netCollection: isSnapshot ? collectionSnapshot.netCollection : liveNetCollection,
    collection: collection
      ? {
          id: collection.id,
          notes: collection.notes,
          collectedAt: collection.collectedAt.toISOString(),
          collectedByName: collection.collectedByName,
          collectedBy: collection.collectedBy,
          snapshot: displaySnapshot,
          cashReconciliation: serializeCashReconciliation(collection),
        }
      : null,
    recentHistory,
  };
}

/** Build snapshot values from live sheet data for persisting on mark-collected. */
export function buildCollectionSnapshotFromSheet(
  sheet: DailyCollectionSheet
): CollectionSnapshot {
  return {
    totalRevenue: sheet.totalRevenue,
    subscriptionRevenue: sheet.subscriptionRevenue,
    productRevenue: sheet.productRevenue,
    totalExpenses: sheet.totalExpenses,
    cashCollected: sheet.paymentBreakdown.cash,
    upiCollected: sheet.paymentBreakdown.upi,
    netCollection: sheet.netCollection,
  };
}
