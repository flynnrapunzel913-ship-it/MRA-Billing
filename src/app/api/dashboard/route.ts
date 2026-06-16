import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { getActiveCustomerWhere } from "@/lib/customer-filters";
import { getActiveInvoiceWhere } from "@/lib/invoice-filters";
import { toKpiNumber } from "@/lib/dashboard-kpis";
import { getTodayRange } from "@/lib/stock-utils";

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const [invoiceWhere, customerWhere] = await Promise.all([
      getActiveInvoiceWhere(),
      getActiveCustomerWhere(),
    ]);
    const { start: todayStart, end: todayEnd } = getTodayRange();

    if (user!.role === Role.RECEPTIONIST) {
      const [activeStudents, invoicesToday, pendingPayments, recentInvoices] = await Promise.all([
        prisma.customer.count({ where: { status: "ACTIVE", ...customerWhere } }),
        prisma.invoice.count({
          where: {
            ...invoiceWhere,
            createdAt: { gte: todayStart, lte: todayEnd },
          },
        }),
        prisma.invoice.count({
          where: {
            ...invoiceWhere,
            paymentStatus: { in: ["PARTIALLY_PAID", "PENDING"] },
          },
        }),
        prisma.invoice.findMany({
          where: invoiceWhere,
          take: 10,
          orderBy: { invoiceDate: "desc" },
          select: {
            id: true,
            invoiceNumber: true,
            customerName: true,
            paymentStatus: true,
            invoiceDate: true,
            items: {
              select: { description: true, itemType: true },
              orderBy: { slNo: "asc" },
            },
          },
        }),
      ]);

      return NextResponse.json({
        role: "RECEPTIONIST",
        activeStudents: toKpiNumber(activeStudents),
        activeCustomers: toKpiNumber(activeStudents),
        invoicesToday: toKpiNumber(invoicesToday),
        pendingPayments: toKpiNumber(pendingPayments),
        recentInvoices: recentInvoices ?? [],
      });
    }

    const [invoiceCount, activeStudents, pendingPayments, recentInvoices] = await Promise.all([
      prisma.invoice.count({ where: invoiceWhere }),
      prisma.customer.count({ where: { status: "ACTIVE", ...customerWhere } }),
      prisma.invoice.count({
        where: {
          ...invoiceWhere,
          paymentStatus: { in: ["PARTIALLY_PAID", "PENDING"] },
        },
      }),
      prisma.invoice.findMany({
        where: invoiceWhere,
        take: 10,
        orderBy: { invoiceDate: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          customerName: true,
          grandTotal: true,
          paymentStatus: true,
          invoiceDate: true,
          createdById: true,
          createdBy: { select: { name: true } },
          items: {
            select: { description: true, itemType: true },
            orderBy: { slNo: "asc" },
          },
        },
      }),
    ]);

    return NextResponse.json({
      role: "ADMIN",
      invoicesGenerated: toKpiNumber(invoiceCount),
      activeStudents: toKpiNumber(activeStudents),
      activeCustomers: toKpiNumber(activeStudents),
      pendingPayments: toKpiNumber(pendingPayments),
      recentInvoices: recentInvoices ?? [],
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load dashboard");
  }
}
