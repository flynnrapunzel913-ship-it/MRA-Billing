import { endOfDay, format, parseISO, startOfDay, subDays } from "date-fns";
import type { InvoicePaymentStatus, Prisma } from "@prisma/client";
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
  totalCollected: number;
};

export type OutstandingPaymentRow = {
  customerName: string;
  invoiceNumber: string;
  invoiceId: string;
  grandTotal: number;
  amountPaid: number;
  amountPending: number;
  status: "PENDING" | "PARTIALLY_PAID";
};

export type OutstandingSummary = {
  pendingCustomerCount: number;
  partialCustomerCount: number;
  outstandingAmount: number;
  rows: OutstandingPaymentRow[];
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
  outstanding: OutstandingSummary;
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

function buildPaymentBreakdown(
  paymentGroups: Array<{ paymentMethod: string; _sum: { amountPaid: unknown } }>
): PaymentBreakdown {
  const breakdown: PaymentBreakdown = {
    cash: 0,
    upi: 0,
    card: 0,
    other: 0,
    totalCollected: 0,
  };

  for (const row of paymentGroups) {
    const amount = toJsonNumber(row._sum.amountPaid);
    switch (row.paymentMethod) {
      case "CASH":
        breakdown.cash = amount;
        break;
      case "UPI":
        breakdown.upi = amount;
        break;
      case "CARD":
        breakdown.card = amount;
        break;
      default:
        breakdown.other += amount;
    }
  }

  breakdown.totalCollected = breakdown.cash + breakdown.upi;
  return breakdown;
}

function buildOutstandingSummary(
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    customerId: string | null;
    grandTotal: unknown;
    amountPaid: unknown;
    amountRemaining: unknown;
    paymentStatus: InvoicePaymentStatus;
  }>
): OutstandingSummary {
  const pendingCustomers = new Set<string>();
  const partialCustomers = new Set<string>();
  let outstandingAmount = 0;

  const rows: OutstandingPaymentRow[] = invoices
    .filter(
      (inv): inv is typeof inv & { paymentStatus: "PENDING" | "PARTIALLY_PAID" } =>
        inv.paymentStatus === "PENDING" || inv.paymentStatus === "PARTIALLY_PAID"
    )
    .map((inv) => {
    const key = inv.customerId ?? inv.customerName;
    if (inv.paymentStatus === "PENDING") pendingCustomers.add(key);
    if (inv.paymentStatus === "PARTIALLY_PAID") partialCustomers.add(key);
    const amountPending = toJsonNumber(inv.amountRemaining);
    outstandingAmount += amountPending;
    return {
      customerName: inv.customerName,
      invoiceNumber: inv.invoiceNumber,
      invoiceId: inv.id,
      grandTotal: toJsonNumber(inv.grandTotal),
      amountPaid: toJsonNumber(inv.amountPaid),
      amountPending,
      status: inv.paymentStatus,
    };
  });

  return {
    pendingCustomerCount: pendingCustomers.size,
    partialCustomerCount: partialCustomers.size,
    outstandingAmount,
    rows,
  };
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

  const outstandingInvoiceWhere: Prisma.InvoiceWhereInput = {
    ...invoiceWhere,
    invoiceDate: { gte: dayStart, lte: dayEnd },
    paymentStatus: { in: ["PENDING", "PARTIALLY_PAID"] },
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
    outstandingInvoices,
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
    prisma.invoice.findMany({
      where: outstandingInvoiceWhere,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        customerId: true,
        grandTotal: true,
        amountPaid: true,
        amountRemaining: true,
        paymentStatus: true,
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
  const liveTotalRevenue = liveSubscriptionRevenue + liveProductRevenue;
  const liveTotalExpenses = expenseRows.reduce((sum, row) => sum + toJsonNumber(row.amount), 0);
  const livePaymentBreakdown = buildPaymentBreakdown(paymentGroups);
  const liveNetCollection = liveTotalRevenue - liveTotalExpenses;
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

  const outstanding = buildOutstandingSummary(outstandingInvoices);

  const collectionSnapshot = collection ? serializeSnapshot(collection) : null;
  const isSnapshot = collectionSnapshot != null;

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
      ? {
          cash: collectionSnapshot.cashCollected,
          upi: collectionSnapshot.upiCollected,
          card: livePaymentBreakdown.card,
          other: livePaymentBreakdown.other,
          totalCollected: collectionSnapshot.cashCollected + collectionSnapshot.upiCollected,
        }
      : livePaymentBreakdown,
    netCollection: isSnapshot ? collectionSnapshot.netCollection : liveNetCollection,
    outstanding,
    collection: collection
      ? {
          id: collection.id,
          notes: collection.notes,
          collectedAt: collection.collectedAt.toISOString(),
          collectedBy: collection.collectedBy,
          snapshot: collectionSnapshot,
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
