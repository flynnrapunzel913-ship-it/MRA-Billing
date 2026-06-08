import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { stockEntrySchema } from "@/lib/validations";
import { buildStockWhere, stockListInclude } from "@/lib/stock-queries";
import { formatStockNumber, serializeStockForJson } from "@/lib/stock-utils";
import {
  cleanupPendingStockBill,
  rollbackStockCreateAfterBillFailure,
} from "@/lib/stock-create-rollback";
import { finalizeStockBill } from "@/lib/stock-storage";
import { getRequestMeta, recordStockActivity } from "@/lib/stock-activity";
import { logAdminAccessViolation } from "@/lib/auth/admin-access-audit";
import { getActiveStockWhere, getDeletedStockWhere } from "@/lib/stock-filters";

export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get("view") === "deleted" ? "deleted" : "active";

    if (view === "deleted" && user!.role !== Role.ADMIN) {
      logAdminAccessViolation({
        userId: user!.id,
        username: user!.username,
        actualRole: user!.role,
        route: request.nextUrl.pathname,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [where, stockWhere] = await Promise.all([
      Promise.resolve(buildStockWhere(searchParams, user!.role!)),
      view === "deleted" ? getDeletedStockWhere() : getActiveStockWhere(),
    ]);

    const entries = await prisma.stockEntry.findMany({
      where: { AND: [where, stockWhere] },
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
    const pendingBillUrl = data.billPdfUrl?.trim() || undefined;

    // Keep DB transaction short — file moves must not run inside $transaction (pool timeout).
    let created;
    try {
      created = await prisma.$transaction(
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
    } catch (error) {
      if (pendingBillUrl) {
        await cleanupPendingStockBill(pendingBillUrl);
      }
      throw error;
    }

    if (pendingBillUrl) {
      let finalizedBillPdfUrl: string | null = null;
      try {
        const bill = await finalizeStockBill(pendingBillUrl, created.id, data.billFileName);
        finalizedBillPdfUrl = bill.billPdfUrl;
        await prisma.stockEntry.update({
          where: { id: created.id },
          data: {
            billPdfUrl: bill.billPdfUrl,
            billFileName: bill.billFileName,
          },
        });
      } catch (error) {
        await rollbackStockCreateAfterBillFailure(created.id, {
          pendingBillUrl,
          finalizedBillPdfUrl,
        });
        throw error;
      }
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
