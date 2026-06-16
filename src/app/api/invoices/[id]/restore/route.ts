import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import {
  canDeleteInvoice,
  invoiceForbiddenResponse,
  invoiceNotFoundResponse,
} from "@/lib/invoices/access";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true, invoiceNumber: true, deletedAt: true, createdById: true },
    });

    if (!invoice || !invoice.deletedAt) {
      return invoiceNotFoundResponse();
    }

    if (
      !canDeleteInvoice(user!.role as Role, user!.id, {
        createdById: invoice.createdById,
      })
    ) {
      return invoiceForbiddenResponse();
    }

    await prisma.invoice.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to restore invoice");
  }
}
