import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { stockEntrySchema } from "@/lib/validations";
import { buildStockWhere, stockListInclude } from "@/lib/stock-queries";
import { formatStockNumber, serializeStockForJson } from "@/lib/stock-utils";
import { finalizeStockBill } from "@/lib/stock-storage";
import { getRequestMeta, recordStockActivity } from "@/lib/stock-activity";

export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const where = buildStockWhere(request.nextUrl.searchParams, user!.role!);

    const entries = await prisma.stockEntry.findMany({
      where,
      include: stockListInclude,
      orderBy: { purchaseDate: "desc" },
      take: 500,
    });

    return NextResponse.json(entries.map(serializeStockForJson));
  } catch (error) {
    return apiErrorResponse(error, "Failed to load stock inventory");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = stockEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const purchaseDate = new Date(data.purchaseDate);
    if (Number.isNaN(purchaseDate.getTime())) {
      return NextResponse.json({ error: "Invalid purchase date" }, { status: 400 });
    }

    const year = purchaseDate.getFullYear();
    const meta = getRequestMeta(request);

    // Keep DB transaction short — file moves must not run inside $transaction (pool timeout).
    const created = await prisma.$transaction(
      async (tx) => {
        const seq = await tx.stockSequence.upsert({
          where: { year },
          create: { year, lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
        });

        const stockNumber = formatStockNumber(year, seq.lastNumber);

        const row = await tx.stockEntry.create({
          data: {
            stockNumber,
            itemName: data.itemName.trim(),
            category: data.category.trim(),
            quantityPurchased: data.quantityPurchased,
            totalCost: new Prisma.Decimal(data.totalCost),
            supplierName: data.supplierName.trim(),
            purchaseDate,
            remarks: data.remarks?.trim() || null,
            billPdfUrl: null,
            billFileName: data.billFileName?.trim() || null,
            createdById: user!.id!,
          },
        });

        await recordStockActivity(tx, {
          stockEntryId: row.id,
          userId: user!.id!,
          type: "STOCK_CREATED",
          description: `${stockNumber} — ${data.itemName} (${data.quantityPurchased} units)`,
          ...meta,
        });

        return row;
      },
      { maxWait: 10_000, timeout: 15_000 }
    );

    if (data.billPdfUrl) {
      const bill = await finalizeStockBill(data.billPdfUrl, created.id, data.billFileName);
      await prisma.stockEntry.update({
        where: { id: created.id },
        data: {
          billPdfUrl: bill.billPdfUrl,
          billFileName: bill.billFileName,
        },
      });
    }

    const entry = await prisma.stockEntry.findUniqueOrThrow({
      where: { id: created.id },
      include: stockListInclude,
    });

    return NextResponse.json(serializeStockForJson(entry), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Failed to create stock entry");
  }
}
