import { endOfDay, format, parseISO, startOfDay, subDays } from "date-fns";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveInvoiceWhere } from "@/lib/invoice-filters";
import { COACHING_PACKAGE_TYPE } from "@/lib/constants";
import { toJsonNumber } from "@/lib/serialize-prisma";
import { normalizeDenominations, type CashDenominations } from "@/lib/cash-denominations";
import {
  calculateCasualSwimDualCouponRevenue,
  DEFAULT_ADULT_COUPON_RATE,
  DEFAULT_CHILD_COUPON_RATE,
  resolveCasualSwimCouponBook,
  type CasualSwimDualCouponTracking,
} from "@/lib/casual-swim-coupon";

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
  grossCollected: number;
  cashExpenses: number;
  upiExpenses: number;
  netCash: number;
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
  invoiceRevenue: number;
  subscriptionRevenue: number;
  productRevenue: number;
  casualSwimRevenue: number;
  casualSwim: CasualSwimDualCouponTracking;
  totalExpenses: number;
  cashCollected: number;
  upiCollected: number;
  cardCollected?: number;
  otherCollected?: number;
  netCollection: number;
};

export type RevenueSourceBreakdown = {
  invoices: number;
  casualSwimming: CasualSwimDualCouponTracking;
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
  invoiceRevenue: number;
  subscriptionRevenue: number;
  productRevenue: number;
  casualSwim: CasualSwimDualCouponTracking;
  revenueSourceBreakdown: RevenueSourceBreakdown;
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

function buildCasualSwimFromPersistedRow(
  row: {
    lastCouponAbove5?: number | null;
    lastCouponBelow5?: number | null;
    casualSwimCouponsAbove5?: number | null;
    casualSwimCouponsBelow5?: number | null;
    casualSwimRevenueAbove5?: unknown;
    casualSwimRevenueBelow5?: unknown;
    casualSwimRevenue?: unknown;
  },
  previous: { above5: number; below5: number },
  rates: { adultRate: number; childRate: number }
): CasualSwimDualCouponTracking {
  const above5 = resolveCasualSwimCouponBook(
    previous.above5,
    rates.adultRate,
    row.lastCouponAbove5 ?? null
  );
  const below5 = resolveCasualSwimCouponBook(
    previous.below5,
    rates.childRate,
    row.lastCouponBelow5 ?? null
  );

  if (row.casualSwimCouponsAbove5 != null || row.casualSwimRevenueAbove5 != null) {
    above5.couponsUsed = row.casualSwimCouponsAbove5 ?? above5.couponsUsed;
    above5.revenue = toJsonNumber(row.casualSwimRevenueAbove5 ?? above5.revenue);
  }
  if (row.casualSwimCouponsBelow5 != null || row.casualSwimRevenueBelow5 != null) {
    below5.couponsUsed = row.casualSwimCouponsBelow5 ?? below5.couponsUsed;
    below5.revenue = toJsonNumber(row.casualSwimRevenueBelow5 ?? below5.revenue);
  }

  const revenue =
    row.casualSwimRevenue != null
      ? toJsonNumber(row.casualSwimRevenue)
      : above5.revenue + below5.revenue;

  return {
    above5,
    below5,
    couponsUsed: above5.couponsUsed + below5.couponsUsed,
    revenue,
  };
}

function serializeSnapshot(
  row: {
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
    totalExpenses: unknown;
    cashCollectedSystem: unknown;
    upiCollected: unknown;
    netCollection: unknown;
    originalSnapshotJson?: unknown;
  },
  previousClosing: { above5: number; below5: number },
  rates: { adultRate: number; childRate: number }
): CollectionSnapshot | null {
  if (row.totalRevenue == null) return null;
  const casualSwim = buildCasualSwimFromPersistedRow(row, previousClosing, rates);
  const snapshot: CollectionSnapshot = {
    totalRevenue: toJsonNumber(row.totalRevenue),
    invoiceRevenue: toJsonNumber(row.invoiceRevenue ?? row.totalRevenue),
    subscriptionRevenue: toJsonNumber(row.subscriptionRevenue),
    productRevenue: toJsonNumber(row.productRevenue),
    casualSwimRevenue: toJsonNumber(row.casualSwimRevenue ?? casualSwim.revenue),
    casualSwim,
    totalExpenses: toJsonNumber(row.totalExpenses),
    cashCollected: toJsonNumber(row.cashCollectedSystem),
    upiCollected: toJsonNumber(row.upiCollected),
    netCollection: toJsonNumber(row.netCollection),
  };
  return enrichSnapshotFromOriginal(snapshot, row.originalSnapshotJson);
}

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

export function computeCollectionTotals(input: {
  subscriptionRevenue: number;
  productRevenue: number;
  grossCash: number;
  grossUpi: number;
  grossCard: number;
  grossOther: number;
  cashExpenses: number;
  upiExpenses: number;
  casualSwimRevenue?: number;
}): {
  invoiceRevenue: number;
  totalRevenue: number;
  totalExpenses: number;
  cashExpenses: number;
  upiExpenses: number;
  netCollection: number;
  paymentBreakdown: PaymentBreakdown;
} {
  const casualSwimRevenue = input.casualSwimRevenue ?? 0;
  const grossCashWithCasual = input.grossCash + casualSwimRevenue;
  const grossCollected =
    grossCashWithCasual + input.grossUpi + input.grossCard + input.grossOther;
  const itemRevenue = input.subscriptionRevenue + input.productRevenue;
  const invoiceRevenue =
    input.grossCash + input.grossUpi + input.grossCard + input.grossOther > 0
      ? input.grossCash + input.grossUpi + input.grossCard + input.grossOther
      : itemRevenue;
  const totalRevenue = invoiceRevenue + casualSwimRevenue;
  const totalExpenses = input.cashExpenses + input.upiExpenses;
  const netCash = grossCashWithCasual - input.cashExpenses;
  const netUpi = input.grossUpi - input.upiExpenses;
  const netCollection = totalRevenue - totalExpenses;

  return {
    invoiceRevenue,
    totalRevenue,
    totalExpenses,
    cashExpenses: input.cashExpenses,
    upiExpenses: input.upiExpenses,
    netCollection,
    paymentBreakdown: {
      cash: grossCashWithCasual,
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
  preferLiveTotals?: boolean;
  lastCouponAbove5?: number;
  lastCouponBelow5?: number;
};

export async function getCasualSwimCouponRates(): Promise<{
  adultRate: number;
  childRate: number;
}> {
  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
    select: { casualSwimAdultCouponRate: true, casualSwimChildCouponRate: true },
  });
  return {
    adultRate: toJsonNumber(settings?.casualSwimAdultCouponRate ?? DEFAULT_ADULT_COUPON_RATE),
    childRate: toJsonNumber(settings?.casualSwimChildCouponRate ?? DEFAULT_CHILD_COUPON_RATE),
  };
}

export async function getPreviousClosingCoupons(
  beforeDate: Date
): Promise<{ above5: number; below5: number }> {
  const row = await prisma.dailyCollection.findFirst({
    where: {
      collectionDate: { lt: beforeDate },
      OR: [{ lastCouponAbove5: { not: null } }, { lastCouponBelow5: { not: null } }],
    },
    orderBy: { collectionDate: "desc" },
    select: { lastCouponAbove5: true, lastCouponBelow5: true },
  });
  return {
    above5: row?.lastCouponAbove5 ?? 0,
    below5: row?.lastCouponBelow5 ?? 0,
  };
}

export function resolveCasualSwimDualCouponTracking(
  previous: { above5: number; below5: number },
  rates: { adultRate: number; childRate: number },
  lastCouponAbove5: number | null,
  lastCouponBelow5: number | null
): CasualSwimDualCouponTracking {
  if (lastCouponAbove5 == null && lastCouponBelow5 == null) {
    return {
      above5: resolveCasualSwimCouponBook(previous.above5, rates.adultRate, null),
      below5: resolveCasualSwimCouponBook(previous.below5, rates.childRate, null),
      couponsUsed: 0,
      revenue: 0,
    };
  }

  const calc = calculateCasualSwimDualCouponRevenue({
    previousAbove5: previous.above5,
    previousBelow5: previous.below5,
    lastCouponAbove5: lastCouponAbove5 ?? previous.above5,
    lastCouponBelow5: lastCouponBelow5 ?? previous.below5,
    adultCouponRate: rates.adultRate,
    childCouponRate: rates.childRate,
  });

  if (!calc.ok) {
    return {
      above5: resolveCasualSwimCouponBook(previous.above5, rates.adultRate, lastCouponAbove5),
      below5: resolveCasualSwimCouponBook(previous.below5, rates.childRate, lastCouponBelow5),
      couponsUsed: 0,
      revenue: 0,
    };
  }

  return calc.result;
}

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
    couponRates,
    previousClosing,
  ] = await Promise.all([
    prisma.invoice.groupBy({
      by: ["paymentMethod"],
      where: paidInvoiceWhere,
      _sum: { amountPaid: true },
    }),
    prisma.invoiceItem.groupBy({
      by: ["description"],
      where: { itemType: COACHING_PACKAGE_TYPE, invoice: paidInvoiceWhere },
      _sum: { amount: true, quantity: true },
    }),
    prisma.invoiceItem.groupBy({
      by: ["description"],
      where: { itemType: "Accessories / Products", invoice: paidInvoiceWhere },
      _sum: { amount: true, quantity: true },
    }),
    prisma.expense.findMany({
      where: expenseWhere,
      orderBy: { createdAt: "asc" },
      include: { createdBy: { select: { name: true, username: true } } },
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
        invoiceRevenue: true,
        subscriptionRevenue: true,
        productRevenue: true,
        casualSwimRevenue: true,
        lastCouponAbove5: true,
        lastCouponBelow5: true,
        casualSwimCouponsAbove5: true,
        casualSwimCouponsBelow5: true,
        casualSwimRevenueAbove5: true,
        casualSwimRevenueBelow5: true,
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
    getCasualSwimCouponRates(),
    getPreviousClosingCoupons(dayStart),
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

  const resolvedLastAbove5 =
    options?.lastCouponAbove5 ??
    (collection?.lastCouponAbove5 != null ? collection.lastCouponAbove5 : null);
  const resolvedLastBelow5 =
    options?.lastCouponBelow5 ??
    (collection?.lastCouponBelow5 != null ? collection.lastCouponBelow5 : null);

  const casualSwim = resolveCasualSwimDualCouponTracking(
    previousClosing,
    couponRates,
    resolvedLastAbove5,
    resolvedLastBelow5
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
    casualSwimRevenue: casualSwim.revenue,
  });

  const isSnapshot = collection != null;
  const persistedSnapshot =
    collection && !options?.preferLiveTotals
      ? serializeSnapshot(collection, previousClosing, couponRates)
      : null;
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
          snapshot: serializeSnapshot(row, { above5: 0, below5: 0 }, couponRates),
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

  const displayCasualSwim = persistedSnapshot?.casualSwim ?? casualSwim;
  const displayTotalRevenue = persistedSnapshot?.totalRevenue ?? liveTotals.totalRevenue;
  const displayInvoiceRevenue = persistedSnapshot?.invoiceRevenue ?? liveTotals.invoiceRevenue;
  const displaySubscriptionRevenue =
    persistedSnapshot?.subscriptionRevenue ?? liveSubscriptionRevenue;
  const displayProductRevenue = persistedSnapshot?.productRevenue ?? liveProductRevenue;
  const displayTotalExpenses = persistedSnapshot?.totalExpenses ?? liveTotalExpenses;
  const displayCashExpenses =
    persistedPaymentBreakdown?.cashExpenses ?? liveCashExpenses;
  const displayUpiExpenses = persistedPaymentBreakdown?.upiExpenses ?? liveUpiExpenses;
  const displayPaymentBreakdown = persistedPaymentBreakdown ?? liveTotals.paymentBreakdown;
  const displayNetCollection = persistedSnapshot?.netCollection ?? liveTotals.netCollection;

  return {
    date: dateStr,
    isSnapshot,
    totalRevenue: displayTotalRevenue,
    invoiceRevenue: displayInvoiceRevenue,
    subscriptionRevenue: displaySubscriptionRevenue,
    productRevenue: displayProductRevenue,
    casualSwim: displayCasualSwim,
    revenueSourceBreakdown: {
      invoices: displayInvoiceRevenue,
      casualSwimming: displayCasualSwim,
    },
    revenueBreakdown: usePersistedTotals ? [] : [...subscriptionBreakdown, ...productBreakdown],
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
          snapshot:
            persistedSnapshot ?? serializeSnapshot(collection, previousClosing, couponRates),
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

export function buildCollectionSnapshotFromSheet(
  sheet: DailyCollectionSheet
): CollectionSnapshot {
  return {
    totalRevenue: sheet.totalRevenue,
    invoiceRevenue: sheet.invoiceRevenue,
    subscriptionRevenue: sheet.subscriptionRevenue,
    productRevenue: sheet.productRevenue,
    casualSwimRevenue: sheet.casualSwim.revenue,
    casualSwim: sheet.casualSwim,
    totalExpenses: sheet.totalExpenses,
    cashCollected: sheet.paymentBreakdown.netCash,
    upiCollected: sheet.paymentBreakdown.upi,
    cardCollected: sheet.paymentBreakdown.card,
    otherCollected: sheet.paymentBreakdown.other,
    netCollection: sheet.netCollection,
  };
}

export type CasualSwimCouponPersistFields = {
  lastCouponAbove5: number;
  lastCouponBelow5: number;
  casualSwimCouponsAbove5: number;
  casualSwimCouponsBelow5: number;
  casualSwimRevenueAbove5: number;
  casualSwimRevenueBelow5: number;
  casualSwimRevenue: number;
};

export function extractCasualSwimCouponPersistFields(
  casualSwim: CasualSwimDualCouponTracking
): CasualSwimCouponPersistFields {
  return {
    lastCouponAbove5: casualSwim.above5.lastCouponNumber ?? casualSwim.above5.previousClosingCoupon,
    lastCouponBelow5: casualSwim.below5.lastCouponNumber ?? casualSwim.below5.previousClosingCoupon,
    casualSwimCouponsAbove5: casualSwim.above5.couponsUsed,
    casualSwimCouponsBelow5: casualSwim.below5.couponsUsed,
    casualSwimRevenueAbove5: casualSwim.above5.revenue,
    casualSwimRevenueBelow5: casualSwim.below5.revenue,
    casualSwimRevenue: casualSwim.revenue,
  };
}
