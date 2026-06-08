import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;

    const entry = await prisma.stockEntry.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });

    if (!entry || !entry.deletedAt) {
      return NextResponse.json({ error: "Stock entry not found" }, { status: 404 });
    }

    await prisma.stockEntry.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to restore stock entry");
  }
}
