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
  paymentMode: "CASH" | "UPI";
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
  /** Expenses paid from cash. */
  cashExpenses: number;
  /** Expenses paid via UPI. */
  upiExpenses: number;
  /** Cash remaining after same-day cash expenses. */
  netCash: number;
  /** UPI remaining after same-day UPI expenses. */
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
  cardCollected?: number;
  otherCollected?: number;
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

export type CollectionEditMeta = {
  lastEditedAt: string;
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
  cashExpenses: number;
  upiExpenses: number;
  expenses: ExpenseDetailRow[];
  paymentBreakdown: PaymentBreakdown;
  netCollection: number;
  collection: CollectionRecord | null;
  editMeta: CollectionEditMeta | null;
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

function enrichSnapshotFromOriginal(
  snapshot: CollectionSnapshot,
  originalSnapshotJson: unknown
): CollectionSnapshot {
  if (!originalSnapshotJson || typeof originalSnapshotJson !== "object" || Array.isArray(originalSnapshotJson)) {
    return snapshot;
  }
  const original = originalSnapshotJson as Record<string, unknown>;
  return {
    ...snapshot,
    cardCollected:
      typeof original.cardCollected === "number" ? original.cardCollected : snapshot.cardCollected,
    otherCollected:
      typeof original.otherCollected === "number" ? original.otherCollected : snapshot.otherCollected,
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
  originalSnapshotJson?: unknown;
}): CollectionSnapshot | null {
  if (row.totalRevenue == null) return null;
  const snapshot: CollectionSnapshot = {
    totalRevenue: toJsonNumber(row.totalRevenue),
    subscriptionRevenue: toJsonNumber(row.subscriptionRevenue),
    productRevenue: toJsonNumber(row.productRevenue),
    totalExpenses: toJsonNumber(row.totalExpenses),
    cashCollected: toJsonNumber(row.cashCollectedSystem),
    upiCollected: toJsonNumber(row.upiCollected),
    netCollection: toJsonNumber(row.netCollection),
  };
  return enrichSnapshotFromOriginal(snapshot, row.originalSnapshotJson);
}

/** Sum expenses by payment mode for daily collection math. */
export function sumExpensesByPaymentMode(
  expenses: Array<{ amount: number; paymentMode: "CASH" | "UPI" }>
): { cashExpenses: number; upiExpenses: number; totalExpenses: number } {
  let cashExpenses = 0;
  let upiExpenses = 0;
  for (const row of expenses) {
    if (row.paymentMode === "UPI") {
      upiExpenses += row.amount;
    } else {
      cashExpenses += row.amount;
    }
  }
  return { cashExpenses, upiExpenses, totalExpenses: cashExpenses + upiExpenses };
}

/** Pure collection math — used by the daily sheet and unit tests. */
export function computeCollectionTotals(input: {
  subscriptionRevenue: number;
  productRevenue: number;
  grossCash: number;
  grossUpi: number;
  grossCard: number;
  grossOther: number;
  cashExpenses: number;
  upiExpenses: number;
}): {
  totalRevenue: number;
  totalExpenses: number;
  cashExpenses: number;
  upiExpenses: number;
  netCollection: number;
  paymentBreakdown: PaymentBreakdown;
} {
  const grossCollected =
    input.grossCash + input.grossUpi + input.grossCard + input.grossOther;
  const itemRevenue = input.subscriptionRevenue + input.productRevenue;
  const totalRevenue = grossCollected > 0 ? grossCollected : itemRevenue;
  const totalExpenses = input.cashExpenses + input.upiExpenses;
  const netCash = input.grossCash - input.cashExpenses;
  const netUpi = input.grossUpi - input.upiExpenses;
  const netCollection = totalRevenue - totalExpenses;

  return {
    totalRevenue,
    totalExpenses,
    cashExpenses: input.cashExpenses,
    upiExpenses: input.upiExpenses,
    netCollection,
    paymentBreakdown: {
      cash: input.grossCash,
      upi: input.grossUpi,
      card: input.grossCard,
      other: input.grossOther,
      grossCollected,
      cashExpenses: input.cashExpenses,
      upiExpenses: input.upiExpenses,
      netCash,
      netUpi,
    },
  };
}

/** Reconstruct payment breakdown from persisted collection snapshot fields. */
export function buildPaymentBreakdownFromSnapshot(
  snapshot: CollectionSnapshot
): PaymentBreakdown {
  const netCash = snapshot.cashCollected;
  const grossUpi = snapshot.upiCollected;
  const netUpi = snapshot.netCollection - netCash;
  const upiExpenses = Math.max(0, grossUpi - netUpi);
  const cashExpenses = Math.max(0, snapshot.totalExpenses - upiExpenses);
  const grossCash = netCash + cashExpenses;
  const card =
    snapshot.cardCollected ??
    Math.max(0, snapshot.totalRevenue - grossCash - grossUpi - (snapshot.otherCollected ?? 0));
  const other = snapshot.otherCollected ?? 0;
  const grossCollected = grossCash + grossUpi + card + other;

  return {
    cash: grossCash,
    upi: grossUpi,
    card,
    other,
    grossCollected,
    cashExpenses,
    upiExpenses,
    netCash,
    netUpi,
  };
}

function buildPaymentBreakdown(
  paymentGroups: Array<{ paymentMethod: string; _sum: { amountPaid: unknown } }>,
  cashExpenses: number,
  upiExpenses: number,
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
    cashExpenses,
    upiExpenses,
  }).paymentBreakdown;
}

export type DailyCollectionSheetOptions = {
  /** When true, always use live invoice/expense totals (mark-collected / edit save). */
  preferLiveTotals?: boolean;
};

export async function getDailyCollectionSheet(
  dateStr: string,
  options?: DailyCollectionSheetOptions
): Promise<DailyCollectionSheet | null> {
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
        editHistory: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
        _count: { select: { editHistory: true } },
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
        originalSnapshotJson: true,
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

  const expenses: ExpenseDetailRow[] = expenseRows.map((row) => ({
    id: row.id,
    expenseDate: row.expenseDate.toISOString(),
    paidTo: row.paidTo,
    reason: row.reason,
    amount: toJsonNumber(row.amount),
    paymentMode: row.paymentMode,
    createdBy: row.createdBy.name || row.createdBy.username,
    createdAt: row.createdAt.toISOString(),
  }));

  const { cashExpenses: liveCashExpenses, upiExpenses: liveUpiExpenses, totalExpenses: liveTotalExpenses } =
    sumExpensesByPaymentMode(expenses);

  const livePaymentBreakdown = buildPaymentBreakdown(
    paymentGroups,
    liveCashExpenses,
    liveUpiExpenses,
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
    cashExpenses: liveCashExpenses,
    upiExpenses: liveUpiExpenses,
  });
  const liveTotalRevenue = liveTotals.totalRevenue;
  const liveNetCollection = liveTotals.netCollection;
  const liveRevenueBreakdown = [...subscriptionBreakdown, ...productBreakdown];

  const isSnapshot = collection != null;
  const persistedSnapshot =
    collection && !options?.preferLiveTotals ? serializeSnapshot(collection) : null;
  const usePersistedTotals = persistedSnapshot != null;
  const persistedPaymentBreakdown = persistedSnapshot
    ? buildPaymentBreakdownFromSnapshot(persistedSnapshot)
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

  const displayTotalRevenue = persistedSnapshot?.totalRevenue ?? liveTotalRevenue;
  const displaySubscriptionRevenue =
    persistedSnapshot?.subscriptionRevenue ?? liveSubscriptionRevenue;
  const displayProductRevenue = persistedSnapshot?.productRevenue ?? liveProductRevenue;
  const displayTotalExpenses = persistedSnapshot?.totalExpenses ?? liveTotalExpenses;
  const displayCashExpenses =
    persistedPaymentBreakdown?.cashExpenses ?? liveCashExpenses;
  const displayUpiExpenses = persistedPaymentBreakdown?.upiExpenses ?? liveUpiExpenses;
  const displayPaymentBreakdown = persistedPaymentBreakdown ?? livePaymentBreakdown;
  const displayNetCollection = persistedSnapshot?.netCollection ?? liveNetCollection;

  return {
    date: dateStr,
    isSnapshot,
    totalRevenue: displayTotalRevenue,
    subscriptionRevenue: displaySubscriptionRevenue,
    productRevenue: displayProductRevenue,
    revenueBreakdown: usePersistedTotals ? [] : liveRevenueBreakdown,
    totalExpenses: displayTotalExpenses,
    cashExpenses: displayCashExpenses,
    upiExpenses: displayUpiExpenses,
    expenses: usePersistedTotals ? [] : expenses,
    paymentBreakdown: displayPaymentBreakdown,
    netCollection: displayNetCollection,
    collection: collection
      ? {
          id: collection.id,
          notes: collection.notes,
          collectedAt: collection.collectedAt.toISOString(),
          collectedByName: collection.collectedByName,
          collectedBy: collection.collectedBy,
          snapshot: persistedSnapshot ?? serializeSnapshot(collection),
          cashReconciliation: serializeCashReconciliation(collection),
        }
      : null,
    editMeta:
      collection && collection._count.editHistory > 0 && collection.editHistory[0]
        ? { lastEditedAt: collection.editHistory[0].createdAt.toISOString() }
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
    cardCollected: sheet.paymentBreakdown.card,
    otherCollected: sheet.paymentBreakdown.other,
    netCollection: sheet.netCollection,
  };
}
