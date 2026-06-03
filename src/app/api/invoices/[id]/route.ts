import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { getActiveInvoiceWhere, isSchemaDriftError } from "@/lib/invoice-filters";
import { canDeleteInvoice } from "@/lib/invoice-permissions";
import { recordUserActivity } from "@/lib/user-activity";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const invoiceWhere = await getActiveInvoiceWhere();

    const invoice = await prisma.invoice.findFirst({
      where: { id, ...invoiceWhere },
      include: {
        items: { orderBy: { slNo: "asc" } },
        customer: true,
        createdBy: { select: { name: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load invoice");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const invoiceWhere = await getActiveInvoiceWhere();

    const invoice = await prisma.invoice.findFirst({
      where: { id, ...invoiceWhere },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (
      !canDeleteInvoice(user!.role as Role, user!.id, {
        createdById: invoice.createdById,
      })
    ) {
      return NextResponse.json(
        { error: "You do not have permission to delete this invoice" },
        { status: 403 }
      );
    }

    try {
      await prisma.invoice.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (updateError) {
      if (isSchemaDriftError(updateError)) {
        await prisma.invoice.delete({ where: { id } });
      } else {
        throw updateError;
      }
    }

    if (user?.id) {
      await recordUserActivity(
        prisma,
        user.id,
        "INVOICE_DELETED",
        invoice.invoiceNumber
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete invoice");
  }
}
