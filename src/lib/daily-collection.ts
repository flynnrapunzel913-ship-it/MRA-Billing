import { endOfDay, format, parseISO, startOfDay, subDays } from "date-fns";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveInvoiceWhere } from "@/lib/invoice-filters";
import { COACHING_PACKAGE_TYPE } from "@/lib/constants";
import { toJsonNumber } from "@/lib/serialize-prisma";

export type SubscriptionBreakdownRow = {
  name: string;
  amount: number;
};

export type ProductBreakdownRow = {
  name: string;
  quantity: number;
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
};

export type CollectionRecord = {
  id: string;
  notes: string | null;
  collectedAt: string;
  collectedBy: { id: string; name: string; username: string };
};

export type CollectionHistoryRow = {
  date: string;
  label: string;
  collected: boolean;
};

export type DailyCollectionSheet = {
  date: string;
  totalRevenue: number;
  totalExpenses: number;
  netAmount: number;
  subscriptionBreakdown: SubscriptionBreakdownRow[];
  productBreakdown: ProductBreakdownRow[];
  expenses: ExpenseDetailRow[];
  paymentBreakdown: PaymentBreakdown;
  collection: CollectionRecord | null;
  recentHistory: CollectionHistoryRow[];
};

export function parseCollectionDateInput(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const parsed = parseISO(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
}

function mapBreakdownAmount(
  groups: Array<{ name: string; amount: unknown }>
): SubscriptionBreakdownRow[] {
  return groups
    .map((row) => ({ name: row.name, amount: toJsonNumber(row.amount) }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);
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
    revenueAgg,
    paymentGroups,
    coachingGroups,
    productGroups,
    expenseRows,
    collection,
    historyCollections,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: paidInvoiceWhere,
      _sum: { amountPaid: true },
    }),
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
      _sum: { amount: true },
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
      orderBy: { createdAt: "desc" },
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
      select: { collectionDate: true },
      orderBy: { collectionDate: "desc" },
    }),
  ]);

  const totalRevenue = toJsonNumber(revenueAgg._sum.amountPaid);
  const totalExpenses = expenseRows.reduce((sum, row) => sum + toJsonNumber(row.amount), 0);
  const netAmount = totalRevenue - totalExpenses;

  const paymentBreakdown: PaymentBreakdown = {
    cash: 0,
    upi: 0,
    card: 0,
    other: 0,
  };

  for (const row of paymentGroups) {
    const amount = toJsonNumber(row._sum.amountPaid);
    switch (row.paymentMethod) {
      case "CASH":
        paymentBreakdown.cash = amount;
        break;
      case "UPI":
        paymentBreakdown.upi = amount;
        break;
      case "CARD":
        paymentBreakdown.card = amount;
        break;
      default:
        paymentBreakdown.other += amount;
    }
  }

  const collectedDates = new Set(
    historyCollections.map((row) => format(startOfDay(row.collectionDate), "yyyy-MM-dd"))
  );

  const recentHistory: CollectionHistoryRow[] = [];
  for (let i = 0; i < 14; i += 1) {
    const date = startOfDay(subDays(dayStart, i));
    const key = format(date, "yyyy-MM-dd");
    recentHistory.push({
      date: key,
      label: format(date, "d MMM yyyy"),
      collected: collectedDates.has(key),
    });
  }

  return {
    date: dateStr,
    totalRevenue,
    totalExpenses,
    netAmount,
    subscriptionBreakdown: mapBreakdownAmount(
      coachingGroups.map((row) => ({
        name: row.description?.trim() || "Coaching Package",
        amount: row._sum.amount,
      }))
    ),
    productBreakdown: productGroups
      .map((row) => ({
        name: row.description?.trim() || "Product",
        quantity: toJsonNumber(row._sum.quantity),
        amount: toJsonNumber(row._sum.amount),
      }))
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount),
    expenses: expenseRows.map((row) => ({
      id: row.id,
      expenseDate: row.expenseDate.toISOString(),
      paidTo: row.paidTo,
      reason: row.reason,
      amount: toJsonNumber(row.amount),
      createdBy: row.createdBy.name || row.createdBy.username,
      createdAt: row.createdAt.toISOString(),
    })),
    paymentBreakdown,
    collection: collection
      ? {
          id: collection.id,
          notes: collection.notes,
          collectedAt: collection.collectedAt.toISOString(),
          collectedBy: collection.collectedBy,
        }
      : null,
    recentHistory,
  };
}
