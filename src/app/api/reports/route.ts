import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

function getDateRange(period: string, startDate?: string | null, endDate?: string | null) {
  const now = new Date();
  switch (period) {
    case "daily":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "weekly":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case "monthly":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "custom":
      return {
        start: startDate ? new Date(startDate) : startOfMonth(now),
        end: endDate ? new Date(endDate) : endOfMonth(now),
      };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "revenue";
  const period = searchParams.get("period") || "monthly";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const { start, end } = getDateRange(period, startDate, endDate);

  if (type === "revenue") {
    const invoices = await prisma.invoice.findMany({
      where: { invoiceDate: { gte: start, lte: end } },
      orderBy: { invoiceDate: "desc" },
    });

    const total = invoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0);
    return NextResponse.json({ type, period, start, end, total, rows: invoices });
  }

  if (type === "gst") {
    const invoices = await prisma.invoice.findMany({
      where: { invoiceDate: { gte: start, lte: end } },
      orderBy: { invoiceDate: "desc" },
    });

    const summary = invoices.reduce(
      (acc, inv) => ({
        subtotal: acc.subtotal + Number(inv.subtotal),
        cgst: acc.cgst + Number(inv.cgstAmount),
        sgst: acc.sgst + Number(inv.sgstAmount),
        totalGst: acc.totalGst + Number(inv.totalGst),
        grandTotal: acc.grandTotal + Number(inv.grandTotal),
      }),
      { subtotal: 0, cgst: 0, sgst: 0, totalGst: 0, grandTotal: 0 }
    );

    return NextResponse.json({ type, period, start, end, summary, rows: invoices });
  }

  if (type === "customers") {
    const customers = await prisma.customer.findMany({
      where: { dateJoined: { gte: start, lte: end } },
      include: { _count: { select: { invoices: true } } },
      orderBy: { dateJoined: "desc" },
    });
    return NextResponse.json({ type, period, start, end, rows: customers });
  }

  if (type === "items") {
    const items = await prisma.invoiceItem.findMany({
      where: {
        invoice: { invoiceDate: { gte: start, lte: end } },
      },
      include: { invoice: true },
    });

    const grouped = items.reduce<Record<string, { name: string; count: number; revenue: number }>>(
      (acc, item) => {
        const key = item.itemType;
        if (!acc[key]) acc[key] = { name: key, count: 0, revenue: 0 };
        acc[key].count += item.quantity;
        acc[key].revenue += Number(item.amount);
        return acc;
      },
      {}
    );

    return NextResponse.json({ type, period, start, end, rows: Object.values(grouped) });
  }

  return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
}
