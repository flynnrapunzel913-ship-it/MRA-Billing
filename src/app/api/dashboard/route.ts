import { NextResponse } from "next/server";

import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { requireAuth } from "@/lib/api-auth";

import { apiErrorResponse } from "@/lib/api-error";

import { getActiveInvoiceWhere } from "@/lib/invoice-filters";

import { toKpiNumber } from "@/lib/dashboard-kpis";



export async function GET() {

  try {

    const { error, user } = await requireAuth();

    if (error) return error;



    const invoiceWhere = await getActiveInvoiceWhere();



    const [invoiceCount, activeStudents, pendingPayments, recentInvoices] = await Promise.all([

      prisma.invoice.count({ where: invoiceWhere }),

      prisma.customer.count({ where: { status: "ACTIVE" } }),

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

          createdBy: { select: { name: true } },

        },

      }),

    ]);



    return NextResponse.json({

      role: user!.role,

      invoicesGenerated: toKpiNumber(invoiceCount),

      activeStudents: toKpiNumber(activeStudents),

      pendingPayments: toKpiNumber(pendingPayments),

      recentInvoices: recentInvoices ?? [],

    });

  } catch (error) {

    return apiErrorResponse(error, "Failed to load dashboard");

  }

}

