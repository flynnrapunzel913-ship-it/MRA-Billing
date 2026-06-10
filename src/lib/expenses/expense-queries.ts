import type { Prisma } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";

export const expenseListInclude = {
  createdBy: { select: { id: true, name: true, username: true } },
} as const;

export function buildExpenseWhere(searchParams: URLSearchParams): Prisma.ExpenseWhereInput {
  const q = searchParams.get("q")?.trim();
  const fromDate = searchParams.get("fromDate") || searchParams.get("from");
  const toDate = searchParams.get("toDate") || searchParams.get("to");

  const and: Prisma.ExpenseWhereInput[] = [];

  if (q) {
    and.push({
      OR: [
        { paidTo: { contains: q, mode: "insensitive" } },
        { reason: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (fromDate) {
    const parsed = new Date(fromDate);
    if (!Number.isNaN(parsed.getTime())) {
      and.push({ expenseDate: { gte: startOfDay(parsed) } });
    }
  }

  if (toDate) {
    const parsed = new Date(toDate);
    if (!Number.isNaN(parsed.getTime())) {
      and.push({ expenseDate: { lte: endOfDay(parsed) } });
    }
  }

  return and.length ? { AND: and } : {};
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
  return { page, pageSize, skip: (page - 1) * pageSize };
}
