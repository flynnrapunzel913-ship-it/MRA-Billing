import type { Prisma, StockActivityType } from "@prisma/client";
import type { NextRequest } from "next/server";

export function getRequestMeta(request?: NextRequest) {
  if (!request) return { ipAddress: undefined as string | undefined, userAgent: undefined as string | undefined };
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined;
  const userAgent = request.headers.get("user-agent") || undefined;
  return { ipAddress, userAgent };
}

export async function recordStockActivity(
  db: Prisma.TransactionClient | typeof import("@/lib/prisma").prisma,
  params: {
    stockEntryId: string;
    userId: string;
    type: StockActivityType;
    description: string;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  return db.stockActivity.create({
    data: {
      stockEntryId: params.stockEntryId,
      userId: params.userId,
      type: params.type,
      description: params.description,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

export const stockActivityTypeLabel: Record<StockActivityType, string> = {
  STOCK_CREATED: "Stock Created",
  STOCK_VIEWED: "Stock Viewed",
  BILL_VIEWED: "Bill Viewed",
  BILL_DOWNLOADED: "Bill Downloaded",
  STOCK_DELETED: "Stock Deleted",
};
