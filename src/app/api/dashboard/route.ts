import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    totalRevenueAgg,
    monthlyRevenueAgg,
    invoiceCount,
    activeStudents,
    pendingPayments,
    recentInvoices,
    monthlyRevenueData,
    itemTypeDistribution,
  ] = await Promise.all([
    prisma.invoice.aggregate({ _sum: { amountPaid: true } }),
    prisma.invoice.aggregate({
      where: { invoiceDate: { gte: monthStart, lte: monthEnd } },
      _sum: { amountPaid: true },
    }),
    prisma.invoice.count(),
    prisma.customer.count({ where: { status: "ACTIVE" } }),
    prisma.invoice.count({ where: { paymentStatus: "PARTIALLY_PAID" } }),
    prisma.invoice.findMany({
      take: 8,
      orderBy: { invoiceDate: "desc" },
      include: { customer: true },
    }),
    getMonthlyRevenue(),
    getItemTypeDistribution(),
  ]);

  return NextResponse.json({
    totalRevenue: Number(totalRevenueAgg._sum.amountPaid || 0),
    monthlyRevenue: Number(monthlyRevenueAgg._sum.amountPaid || 0),
    invoiceCount,
    activeStudents,
    pendingPayments,
    recentInvoices,
    monthlyRevenueData,
    itemTypeDistribution,
  });
}

async function getMonthlyRevenue() {
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return {
      label: date.toLocaleString("en-IN", { month: "short" }),
      start: startOfMonth(date),
      end: endOfMonth(date),
    };
  });

  const data = await Promise.all(
    months.map(async (month) => {
      const agg = await prisma.invoice.aggregate({
        where: { invoiceDate: { gte: month.start, lte: month.end } },
        _sum: { amountPaid: true },
      });
      return { name: month.label, revenue: Number(agg._sum.amountPaid || 0) };
    })
  );

  return data;
}

async function getItemTypeDistribution() {
  const items = await prisma.invoiceItem.groupBy({
    by: ["itemType"],
    _count: { _all: true },
    orderBy: { _count: { itemType: "desc" } },
  });

  return items.map((item) => ({
    name: item.itemType,
    value: item._count._all,
  }));
}
