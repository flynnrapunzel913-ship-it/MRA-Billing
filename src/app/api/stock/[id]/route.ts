import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { stockListInclude } from "@/lib/stock-queries";
import { serializeStockForJson } from "@/lib/stock-utils";
import { getRequestMeta, recordStockActivity } from "@/lib/stock-activity";
import { normalizeCuid } from "@/lib/storage/ids";
import { deleteStockBillStorage } from "@/lib/storage/stock-bills";
import { AUDIT_ACTIONS, logAuditEvent } from "@/lib/audit-log";

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

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id: rawId } = await context.params;
    const id = normalizeCuid(rawId);
    if (!id) {
      return NextResponse.json({ error: "Stock entry not found" }, { status: 404 });
    }

    const entry = await prisma.stockEntry.findUnique({
      where: { id },
      select: {
        id: true,
        stockNumber: true,
        itemName: true,
        billPdfUrl: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Stock entry not found" }, { status: 404 });
    }

    const meta = getRequestMeta(request);

    await prisma.$transaction(async (tx) => {
      await recordStockActivity(tx, {
        stockEntryId: entry.id,
        userId: user!.id!,
        type: "STOCK_DELETED",
        description: `Deleted ${entry.stockNumber} — ${entry.itemName}`,
        ...meta,
      });
      await tx.stockEntry.delete({ where: { id: entry.id } });
    });

    await deleteStockBillStorage(entry.id, entry.billPdfUrl);

    void logAuditEvent({
      userId: user!.id,
      username: user!.username,
      action: AUDIT_ACTIONS.STOCK_DELETED,
      entityType: "STOCK",
      entityId: entry.id,
      details: {
        stockNumber: entry.stockNumber,
        itemName: entry.itemName,
        billPdfUrl: entry.billPdfUrl,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete stock entry");
  }
}
