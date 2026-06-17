import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { AUDIT_ACTIONS, logAuditEvent } from "@/lib/audit-log";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const ticketCount = await prisma.casualSwimBill.count();
    const sequence = await prisma.casualSwimTicketSequence.findUnique({
      where: { id: "default" },
    });

    return NextResponse.json({
      ticketCount,
      lastNumber: sequence?.lastNumber ?? 0,
      canReset: ticketCount === 0,
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load ticket counter status");
  }
}

export async function POST() {
  try {
    const { error, user } = await requireAdmin();
    if (error) return error;

    const ticketCount = await prisma.casualSwimBill.count();
    if (ticketCount > 0) {
      return NextResponse.json(
        { error: "Delete all tickets before resetting counter." },
        { status: 400 }
      );
    }

    await prisma.casualSwimTicketSequence.upsert({
      where: { id: "default" },
      create: { id: "default", lastNumber: 0 },
      update: { lastNumber: 0 },
    });

    void logAuditEvent({
      userId: user!.id,
      username: user!.username,
      action: AUDIT_ACTIONS.CASUAL_SWIM_TICKET_COUNTER_RESET,
      entityType: "CASUAL_SWIM_TICKET_SEQUENCE",
      entityId: "default",
      details: { lastNumber: 0 },
    });

    return NextResponse.json({ success: true, lastNumber: 0 });
  } catch (error) {
    return apiErrorResponse(error, "Failed to reset ticket counter");
  }
}
