import { NextRequest, NextResponse } from "next/server";
import { endOfDay, startOfDay } from "date-fns";
import { Role } from "@prisma/client";import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireCasualSwimAccess } from "@/lib/auth/guards";
import { serializeCasualSwimBill } from "@/lib/casual-swim-bill";
import { generateCasualSwimReceiptPdfBuffer } from "@/lib/generate-casual-swim-receipt-pdf";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { error, user } = await requireCasualSwimAccess();
    if (error) return error;

    const { id } = await params;
    const bill = await prisma.casualSwimBill.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, username: true } },
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const now = new Date();
    if (
      user!.role === Role.CASHIER &&
      !(bill.createdAt >= startOfDay(now) && bill.createdAt <= endOfDay(now))
    ) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const dto = serializeCasualSwimBill(bill);
    const buffer = await generateCasualSwimReceiptPdfBuffer(dto);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="ticket-${dto.ticketNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to generate receipt PDF");
  }
}
