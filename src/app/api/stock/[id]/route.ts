import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { stockListInclude } from "@/lib/stock-queries";
import { serializeStockForJson } from "@/lib/stock-utils";
import { getRequestMeta, recordStockActivity } from "@/lib/stock-activity";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const entry = await prisma.stockEntry.findUnique({
      where: { id },
      include: {
        ...stockListInclude,
        activities: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: { select: { username: true, name: true } } },
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Stock entry not found" }, { status: 404 });
    }

    const meta = getRequestMeta(request);
    void recordStockActivity(prisma, {
      stockEntryId: entry.id,
      userId: user!.id!,
      type: "STOCK_VIEWED",
      description: `Viewed ${entry.stockNumber}`,
      ...meta,
    });

    return NextResponse.json(serializeStockForJson(entry));
  } catch (error) {
    return apiErrorResponse(error, "Failed to load stock entry");
  }
}
