import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalAccess } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import {
  calculateInvoiceTotals,
  calculatePaymentAmounts,
  formatInvoiceNumber,
} from "@/lib/invoice-utils";
import {
  canDuplicateInvoice,
  findAccessibleInvoice,
  invoiceForbiddenResponse,
  invoiceNotFoundResponse,
} from "@/lib/invoices/access";
import { getActiveCustomerWhere } from "@/lib/customer-filters";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireOperationalAccess();
    if (error) return error;

    const { id } = await params;

    type InvoiceWithItems = Prisma.InvoiceGetPayload<{ include: { items: true } }>;

    const access = await findAccessibleInvoice<InvoiceWithItems>(id, {
      id: user!.id!,
      role: user!.role as Role,
    }, {
      include: { items: true },
    });

    if (!access.ok) {
      return access.status === 403 ? invoiceForbiddenResponse() : invoiceNotFoundResponse();
    }

    const original = access.invoice;

    if (!canDuplicateInvoice({ id: user!.id!, role: user!.role as Role }, original)) {
      return invoiceForbiddenResponse();
    }

    const items = original.items.map((item) => ({
      itemType: item.itemType,
      description: item.description,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      packageStartDate: item.packageStartDate?.toISOString(),
      packageEndDate: item.packageEndDate?.toISOString(),
    }));

    const totals = calculateInvoiceTotals(items, {
      gstEnabled: original.gstEnabled,
      cgstRate: Number(original.cgstRate),
      sgstRate: Number(original.sgstRate),
    });
    const paymentAmounts = calculatePaymentAmounts(
      totals.grandTotal,
      original.paymentStatus,
      Number(original.amountPaid)
    );

    const invoiceDate = new Date();
    const year = invoiceDate.getFullYear();

    let linkedCustomerId = original.customerId;
    if (linkedCustomerId) {
      const customerWhere = await getActiveCustomerWhere();
      const activeCustomer = await prisma.customer.findFirst({
        where: { id: linkedCustomerId, ...customerWhere },
        select: { id: true },
      });
      linkedCustomerId = activeCustomer?.id ?? null;
    }

    const duplicate = await prisma.$transaction(async (tx) => {
      const sequence = await tx.invoiceSequence.upsert({
        where: { year },
        update: { lastNumber: { increment: 1 } },
        create: { year, lastNumber: 1 },
      });

      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 7);

      return tx.invoice.create({
        data: {
          invoiceNumber: formatInvoiceNumber(year, sequence.lastNumber),
          invoiceDate,
          dueDate,
          customerId: linkedCustomerId,
          customerName: original.customerName,
          customerMobile: original.customerMobile,
          customerAddress: original.customerAddress,
          customerGst: original.customerGst,
          subtotal: totals.subtotal,
          gstEnabled: totals.gstEnabled,
          cgstRate: totals.cgstRate,
          sgstRate: totals.sgstRate,
          cgstAmount: totals.cgstAmount,
          sgstAmount: totals.sgstAmount,
          totalGst: totals.totalGst,
          grandTotal: totals.grandTotal,
          amountInWords: totals.amountInWords,
          paymentStatus: original.paymentStatus,
          paymentMethod: original.paymentMethod,
          amountPaid: paymentAmounts.amountPaid,
          amountRemaining: paymentAmounts.amountRemaining,
          notes: original.notes,
          createdById: user!.id!,
          items: {
            create: original.items.map((item, index) => ({
              slNo: index + 1,
              itemType: item.itemType,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
              packageStartDate: item.packageStartDate,
              packageEndDate: item.packageEndDate,
              subscriptionPlanId: item.subscriptionPlanId,
              planNameSnapshot: item.planNameSnapshot,
              descriptionSnapshot: item.descriptionSnapshot,
              durationSnapshot: item.durationSnapshot,
              durationValueSnapshot: item.durationValueSnapshot,
              durationUnitSnapshot: item.durationUnitSnapshot,
              usageDaysSnapshot: item.usageDaysSnapshot,
              feesSnapshot: item.feesSnapshot,
            })),
          },
        },
        include: { items: true },
      });
    });

    return NextResponse.json(duplicate, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Failed to duplicate invoice");
  }
}
