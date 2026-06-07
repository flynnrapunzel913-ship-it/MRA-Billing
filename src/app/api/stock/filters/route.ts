import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { Role } from "@prisma/client";
import { getActiveStockWhere } from "@/lib/stock-filters";

/** Distinct filter options for admin stock listing */
export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const stockWhere = await getActiveStockWhere();

    const [categories, suppliers, creators] = await Promise.all([
      prisma.stockEntry.findMany({
        where: stockWhere,
        distinct: ["category"],
        select: { category: true },
        orderBy: { category: "asc" },
      }),
      prisma.stockEntry.findMany({
        where: stockWhere,
        distinct: ["supplierName"],
        select: { supplierName: true },
        orderBy: { supplierName: "asc" },
      }),
      user!.role === Role.ADMIN
        ? prisma.user.findMany({
            where: {
              stockEntries: { some: stockWhere },
            },
            select: { id: true, username: true, name: true },
            orderBy: { username: "asc" },
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      categories: categories.map((c) => c.category),
      suppliers: suppliers.map((s) => s.supplierName),
      creators,
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load filter options");
  }
}
