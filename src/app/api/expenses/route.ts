import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { AUDIT_ACTIONS, logAuditEvent } from "@/lib/audit-log";
import { expenseSchema } from "@/lib/validations";
import {
  buildExpenseWhere,
  expenseListInclude,
  parsePagination,
} from "@/lib/expenses/expense-queries";
import { serializeExpenseForJson } from "@/lib/expenses/serialize-expense";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const where = buildExpenseWhere(searchParams);
    const { page, pageSize, skip } = parsePagination(searchParams);

    const [total, items] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        include: expenseListInclude,
        orderBy: { expenseDate: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      items: items.map(serializeExpenseForJson),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load expenses");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const expenseDate = new Date(data.expenseDate);
    if (Number.isNaN(expenseDate.getTime())) {
      return NextResponse.json({ error: "Invalid expense date" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        expenseDate,
        paidTo: data.paidTo.trim(),
        reason: data.reason.trim(),
        amount: data.amount,
        createdById: user!.id!,
      },
      include: expenseListInclude,
    });

    void logAuditEvent({
      userId: user!.id,
      username: user!.username,
      action: AUDIT_ACTIONS.EXPENSE_CREATED,
      entityType: "EXPENSE",
      entityId: expense.id,
      details: {
        paidTo: expense.paidTo,
        reason: expense.reason,
        amount: Number(expense.amount),
        expenseDate: expense.expenseDate.toISOString(),
      },
    });

    return NextResponse.json(serializeExpenseForJson(expense), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Failed to create expense");
  }
}
