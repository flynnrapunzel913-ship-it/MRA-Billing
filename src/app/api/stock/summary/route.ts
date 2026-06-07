import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { getMonthRange } from "@/lib/stock-utils";
import { toJsonNumber } from "@/lib/serialize-prisma";
import { getActiveStockWhere } from "@/lib/stock-filters";

export async function GET() {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { start, end } = getMonthRange();
    const stockWhere = await getActiveStockWhere();

    const [totalEntries, aggregates, monthAgg] = await Promise.all([
      prisma.stockEntry.count({ where: stockWhere }),
      prisma.stockEntry.aggregate({
        where: stockWhere,
        _sum: { totalCost: true, quantityPurchased: true },
      }),
      prisma.stockEntry.aggregate({
        where: { purchaseDate: { gte: start, lte: end }, ...stockWhere },
        _sum: { totalCost: true },
      }),
    ]);

    return NextResponse.json({
      totalEntries,
      totalPurchaseCost: toJsonNumber(aggregates._sum.totalCost),
      monthPurchases: toJsonNumber(monthAgg._sum.totalCost),
      totalUnitsPurchased: aggregates._sum.quantityPurchased ?? 0,
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load stock summary");
  }
}
