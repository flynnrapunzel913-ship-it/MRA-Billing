import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { AUDIT_ACTIONS, logAuditEvent } from "@/lib/audit-log";
import { expenseSchema } from "@/lib/validations";
import { expenseListInclude } from "@/lib/expenses/expense-queries";
import { serializeExpenseForJson } from "@/lib/expenses/serialize-expense";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: expenseListInclude,
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json(serializeExpenseForJson(expense));
  } catch (error) {
    return apiErrorResponse(error, "Failed to load expense");
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;

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

    const existing = await prisma.expense.findUnique({
      where: { id },
      select: { id: true, paidTo: true, reason: true, amount: true, expenseDate: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const data = parsed.data;
    const expenseDate = new Date(data.expenseDate);
    if (Number.isNaN(expenseDate.getTime())) {
      return NextResponse.json({ error: "Invalid expense date" }, { status: 400 });
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        expenseDate,
        paidTo: data.paidTo.trim(),
        reason: data.reason.trim(),
        amount: data.amount,
      },
      include: expenseListInclude,
    });

    void logAuditEvent({
      userId: user!.id,
      username: user!.username,
      action: AUDIT_ACTIONS.EXPENSE_UPDATED,
      entityType: "EXPENSE",
      entityId: expense.id,
      details: {
        before: {
          paidTo: existing.paidTo,
          reason: existing.reason,
          amount: Number(existing.amount),
          expenseDate: existing.expenseDate.toISOString(),
        },
        after: {
          paidTo: expense.paidTo,
          reason: expense.reason,
          amount: Number(expense.amount),
          expenseDate: expense.expenseDate.toISOString(),
        },
      },
    });

    return NextResponse.json(serializeExpenseForJson(expense));
  } catch (error) {
    return apiErrorResponse(error, "Failed to update expense");
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;

    const expense = await prisma.expense.findUnique({
      where: { id },
      select: {
        id: true,
        paidTo: true,
        reason: true,
        amount: true,
        expenseDate: true,
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await prisma.expense.delete({ where: { id: expense.id } });

    void logAuditEvent({
      userId: user!.id,
      username: user!.username,
      action: AUDIT_ACTIONS.EXPENSE_DELETED,
      entityType: "EXPENSE",
      entityId: expense.id,
      details: {
        paidTo: expense.paidTo,
        reason: expense.reason,
        amount: Number(expense.amount),
        expenseDate: expense.expenseDate.toISOString(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete expense");
  }
}
