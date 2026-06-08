import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { permanentlyDeleteStockEntry } from "@/lib/stock-purge";
import { normalizeCuid } from "@/lib/storage/ids";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id: rawId } = await params;
    const id = normalizeCuid(rawId);
    if (!id) {
      return NextResponse.json({ error: "Stock entry not found" }, { status: 404 });
    }

    const entry = await prisma.stockEntry.findUnique({
      where: { id },
      select: { id: true, deletedAt: true, billPdfUrl: true },
    });

    if (!entry || !entry.deletedAt) {
      return NextResponse.json({ error: "Stock entry not found" }, { status: 404 });
    }

    await permanentlyDeleteStockEntry({
      id: entry.id,
      billPdfUrl: entry.billPdfUrl,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to permanently delete stock entry");
  }
}
