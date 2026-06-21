import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveInvoiceWhere } from "@/lib/invoice-filters";
import { COACHING_PACKAGE_TYPE } from "@/lib/constants";
import { toJsonNumber } from "@/lib/serialize-prisma";

export type FinancialSummaryPeriod = "today" | "week" | "month";

export type BreakdownRow = {
  name: string;
  amount: number;
};

export type FinancialSummaryResult = {
  period: FinancialSummaryPeriod;
  start: string;
  end: string;
  totalCollections: number;
  totalExpenses: number;
  netAmount: number;
  revenueBreakdown: BreakdownRow[];
  productBreakdown: BreakdownRow[];
  subscriptionBreakdown: BreakdownRow[];
  expenseBreakdown: BreakdownRow[];
};

export function getFinancialSummaryDateRange(period: FinancialSummaryPeriod) {
  const now = new Date();
  switch (period) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
}

function mapBreakdownRows(
  groups: Array<{ name: string; amount: unknown }>
): BreakdownRow[] {
  return groups
    .map((row) => ({
      name: row.name,
      amount: toJsonNumber(row.amount),
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export async function getFinancialSummary(
  period: FinancialSummaryPeriod
): Promise<FinancialSummaryResult> {
  const { start, end } = getFinancialSummaryDateRange(period);
  const invoiceWhere = await getActiveInvoiceWhere();

  const paidInvoiceWhere: Prisma.InvoiceWhereInput = {
    ...invoiceWhere,
    invoiceDate: { gte: start, lte: end },
    paymentStatus: { in: ["FULLY_PAID", "PARTIALLY_PAID"] },
    amountPaid: { gt: 0 },
  };

  const expenseWhere = {
    expenseDate: { gte: start, lte: end },
  };

  const [collectionAgg, expenseAgg, expenseGroups, itemGroups, reconciledCasualSwimAgg] =
    await Promise.all([
    prisma.invoice.aggregate({
      where: paidInvoiceWhere,
      _sum: { amountPaid: true },
    }),
    prisma.expense.aggregate({
      where: expenseWhere,
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["reason"],
      where: expenseWhere,
      _sum: { amount: true },
    }),
    prisma.invoiceItem.groupBy({
      by: ["itemType", "description"],
      where: { invoice: paidInvoiceWhere },
      _sum: { amount: true },
    }),
    prisma.casualSwimReconciliation.aggregate({
      where: { collectionDate: { gte: start, lte: end } },
      _sum: { cashAmount: true, upiAmount: true },
    }),
  ]);

  const invoiceCollections = toJsonNumber(collectionAgg._sum.amountPaid);
  const reconciledCasualSwim =
    toJsonNumber(reconciledCasualSwimAgg._sum.cashAmount) +
    toJsonNumber(reconciledCasualSwimAgg._sum.upiAmount);
  const totalCollections = invoiceCollections + reconciledCasualSwim;
  const totalExpenses = toJsonNumber(expenseAgg._sum.amount);
  const netAmount = totalCollections - totalExpenses;

  const subscriptionBreakdown: BreakdownRow[] = [];
  const productBreakdown: BreakdownRow[] = [];
  let productSalesTotal = 0;
  let otherServicesTotal = 0;

  for (const row of itemGroups) {
    const amount = toJsonNumber(row._sum.amount);
    if (amount <= 0) continue;

    if (row.itemType === COACHING_PACKAGE_TYPE) {
      subscriptionBreakdown.push({ name: row.description, amount });
    } else if (row.itemType === "Accessories / Products") {
      productBreakdown.push({ name: row.description, amount });
      productSalesTotal += amount;
    } else {
      otherServicesTotal += amount;
    }
  }

  subscriptionBreakdown.sort((a, b) => b.amount - a.amount);
  productBreakdown.sort((a, b) => b.amount - a.amount);

  const revenueBreakdown: BreakdownRow[] = [...subscriptionBreakdown];
  if (productSalesTotal > 0) {
    revenueBreakdown.push({ name: "Product Sales", amount: productSalesTotal });
  }
  if (otherServicesTotal > 0) {
    revenueBreakdown.push({ name: "Other Services", amount: otherServicesTotal });
  }
  if (reconciledCasualSwim > 0) {
    revenueBreakdown.push({ name: "Casual Swimming (Reconciled)", amount: reconciledCasualSwim });
  }
  revenueBreakdown.sort((a, b) => b.amount - a.amount);

  const expenseBreakdown = mapBreakdownRows(
    expenseGroups.map((row) => ({
      name: row.reason,
      amount: row._sum.amount,
    }))
  );

  return {
    period,
    start: start.toISOString(),
    end: end.toISOString(),
    totalCollections,
    totalExpenses,
    netAmount,
    revenueBreakdown,
    productBreakdown,
    subscriptionBreakdown,
    expenseBreakdown,
  };
}
