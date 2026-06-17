import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireAdmin } from "@/lib/auth/guards";
import { serializeCasualSwimBill } from "@/lib/casual-swim-bill";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const bills = await prisma.casualSwimBill.findMany({
      orderBy: { ticketNumber: "desc" },
      take: 500,
      include: {
        createdBy: { select: { id: true, name: true, username: true } },
      },
    });

    return NextResponse.json({
      bills: bills.map(serializeCasualSwimBill),
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load ticket history");
  }
}
