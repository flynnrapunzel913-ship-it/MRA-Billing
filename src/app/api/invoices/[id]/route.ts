import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { isSchemaDriftError } from "@/lib/invoice-filters";
import {
  canDeleteInvoice,
  findAccessibleInvoice,
  invoiceForbiddenResponse,
  invoiceNotFoundResponse,
} from "@/lib/invoices/access";
import { recordUserActivity } from "@/lib/user-activity";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    type InvoiceDetail = Prisma.InvoiceGetPayload<{
      include: {
        items: { orderBy: { slNo: "asc" } };
        customer: true;
        createdBy: { select: { name: true } };
      };
    }>;

    const result = await findAccessibleInvoice<InvoiceDetail>(id, {
      id: user!.id!,
      role: user!.role as Role,
    }, {
      include: {
        items: { orderBy: { slNo: "asc" } },
        customer: true,
        createdBy: { select: { name: true } },
      },
    });

    if (!result.ok) {
      return result.status === 403 ? invoiceForbiddenResponse() : invoiceNotFoundResponse();
    }

    return NextResponse.json(result.invoice);
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
    const result = await findAccessibleInvoice(id, {
      id: user!.id!,
      role: user!.role as Role,
    });

    if (!result.ok) {
      return result.status === 403 ? invoiceForbiddenResponse() : invoiceNotFoundResponse();
    }

    const invoice = result.invoice;

    if (
      !canDeleteInvoice(user!.role as Role, user!.id, {
        createdById: invoice.createdById,
      })
    ) {
      return invoiceForbiddenResponse();
    }

    try {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { deletedAt: new Date() },
      });
    } catch (updateError) {
      if (isSchemaDriftError(updateError)) {
        await prisma.invoice.delete({ where: { id: invoice.id } });
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
