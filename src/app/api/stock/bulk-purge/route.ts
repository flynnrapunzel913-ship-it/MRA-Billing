import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { permanentlyDeleteStockEntry } from "@/lib/stock-purge";
import { normalizeCuid } from "@/lib/storage/ids";

const bulkPurgeSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = bulkPurgeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const ids = [
      ...new Set(
        parsed.data.ids.map((raw) => normalizeCuid(raw)).filter((id): id is string => !!id)
      ),
    ];

    if (ids.length === 0) {
      return NextResponse.json({ success: true, deletedCount: 0 });
    }

    const entries = await prisma.stockEntry.findMany({
      where: {
        id: { in: ids },
        deletedAt: { not: null },
      },
      select: { id: true, billPdfUrl: true },
    });

    for (const entry of entries) {
      await permanentlyDeleteStockEntry(entry);
    }

    return NextResponse.json({ success: true, deletedCount: entries.length });
  } catch (error) {
    return apiErrorResponse(error, "Failed to permanently delete stock entries");
  }
}
