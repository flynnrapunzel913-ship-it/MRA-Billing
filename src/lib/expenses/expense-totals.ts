import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toJsonNumber } from "@/lib/serialize-prisma";

export type ExpenseDateRange = {
  from?: Date;
  to?: Date;
};

function buildExpenseDateWhere(range?: ExpenseDateRange): Prisma.ExpenseWhereInput {
  if (!range?.from && !range?.to) return {};
  const expenseDate: Prisma.DateTimeFilter = {};
  if (range.from) expenseDate.gte = range.from;
  if (range.to) expenseDate.lte = range.to;
  return { expenseDate };
}

export async function sumExpenses(range?: ExpenseDateRange): Promise<number> {
  const result = await prisma.expense.aggregate({
    where: buildExpenseDateWhere(range),
    _sum: { amount: true },
  });
  return toJsonNumber(result._sum.amount);
}

export async function sumInvoiceRevenue(
  invoiceWhere: Prisma.InvoiceWhereInput,
  range?: ExpenseDateRange
): Promise<number> {
  const dateFilter =
    range?.from || range?.to
      ? {
          invoiceDate: {
            ...(range.from ? { gte: range.from } : {}),
            ...(range.to ? { lte: range.to } : {}),
          },
        }
      : {};

  const result = await prisma.invoice.aggregate({
    where: { ...invoiceWhere, ...dateFilter },
    _sum: { amountPaid: true },
  });
  return toJsonNumber(result._sum.amountPaid);
}

export function netProfit(totalRevenue: number, totalExpenses: number): number {
  return totalRevenue - totalExpenses;
}
