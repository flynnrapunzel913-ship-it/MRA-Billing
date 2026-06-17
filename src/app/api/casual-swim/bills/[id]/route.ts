import { NextRequest, NextResponse } from "next/server";
import { endOfDay, startOfDay } from "date-fns";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireAdmin, requireCasualSwimAccess } from "@/lib/auth/guards";
import { AUDIT_ACTIONS, logAuditEvent } from "@/lib/audit-log";
import { serializeCasualSwimBill } from "@/lib/casual-swim-bill";
import { toJsonNumber } from "@/lib/serialize-prisma";

function isBillFromToday(createdAt: Date): boolean {
  const now = new Date();
  return createdAt >= startOfDay(now) && createdAt <= endOfDay(now);
}
type RouteContext = { params: Promise<{ id: string }> };

const billInclude = {
  createdBy: { select: { id: true, name: true, username: true } },
} as const;

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { error, user } = await requireCasualSwimAccess();
    if (error) return error;

    const { id } = await params;
    const bill = await prisma.casualSwimBill.findUnique({
      where: { id },
      include: billInclude,
    });

    if (!bill) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (user!.role === Role.CASHIER && !isBillFromToday(bill.createdAt)) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json(serializeCasualSwimBill(bill));
  } catch (error) {
    return apiErrorResponse(error, "Failed to load ticket");
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { error, user } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const bill = await prisma.casualSwimBill.findUnique({
      where: { id },
      include: billInclude,
    });

    if (!bill) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    await prisma.casualSwimBill.delete({ where: { id } });

    void logAuditEvent({
      userId: user!.id,
      username: user!.username,
      action: AUDIT_ACTIONS.CASUAL_SWIM_BILL_DELETED,
      entityType: "CASUAL_SWIM_BILL",
      entityId: bill.id,
      details: {
        ticketNumber: bill.ticketNumber,
        amount: toJsonNumber(bill.totalAmount),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete ticket");
  }
}
