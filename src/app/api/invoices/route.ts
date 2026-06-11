import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import {
  calculateInvoiceTotals,
  calculatePaymentAmounts,
  formatInvoiceNumber,
} from "@/lib/invoice-utils";
import { resolveInvoiceCustomer } from "@/lib/invoices/resolve-invoice-customer";
import { serializeInvoiceForJson } from "@/lib/serialize-prisma";
import { recordCustomerActivity } from "@/lib/customer-activity";
import { recordUserActivity } from "@/lib/user-activity";
import { getActiveInvoiceWhere, getDeletedInvoiceWhere } from "@/lib/invoice-filters";
import { apiErrorResponse, prismaErrorMessage } from "@/lib/api-error";
import { COACHING_PACKAGE_TYPE } from "@/lib/constants";
import { assertAccessibleCustomer } from "@/lib/invoices/access";
import { AUDIT_ACTIONS, logAuditEvent } from "@/lib/audit-log";
import { logAdminAccessViolation } from "@/lib/auth/admin-access-audit";

async function getGstSettings() {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  return {
    gstEnabled: settings?.gstEnabled ?? true,
    cgstRate: Number(settings?.defaultCgstRate ?? 9),
    sgstRate: Number(settings?.defaultSgstRate ?? 9),
  };
}

function parseOptionalDate(value?: string) {
  if (!value?.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get("view") === "deleted" ? "deleted" : "active";

    if (view === "deleted" && user!.role !== Role.ADMIN) {
      logAdminAccessViolation({
        userId: user!.id,
        username: user!.username,
        actualRole: user!.role,
        route: request.nextUrl.pathname,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invoiceWhere =
      view === "deleted" ? await getDeletedInvoiceWhere() : await getActiveInvoiceWhere();

    const q = searchParams.get("q") || "";
    const paymentStatus = searchParams.get("paymentStatus");

    const invoices = await prisma.invoice.findMany({
      where: {
        ...invoiceWhere,
        AND: [
          q
            ? {
                OR: [
                  { invoiceNumber: { contains: q, mode: "insensitive" } },
                  { customerName: { contains: q, mode: "insensitive" } },
                  { customerMobile: { contains: q } },
                ],
              }
            : {},
          paymentStatus ? { paymentStatus: paymentStatus as never } : {},
        ],
      },
      include: {
        customer: true,
        items: true,
        createdBy: { select: { name: true } },
      },
      orderBy: { invoiceDate: "desc" },
    });

    return NextResponse.json(invoices.map(serializeInvoiceForJson));
  } catch (error) {
    return apiErrorResponse(error, "Failed to load invoices");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { invoiceSchema } = await import("@/lib/validations");
    const parsed = invoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.customerId) {
      const customerAccess = await assertAccessibleCustomer(data.customerId);
      if (!customerAccess.ok) {
        return NextResponse.json(
          { success: false, error: "Customer not found" },
          { status: 404 }
        );
      }
    }

    const gstSettings = await getGstSettings();
    const totals = calculateInvoiceTotals(data.items, {
      gstEnabled: data.gstEnabled ?? gstSettings.gstEnabled,
      cgstRate: data.cgstRate ?? gstSettings.cgstRate,
      sgstRate: data.sgstRate ?? gstSettings.sgstRate,
    });

    if (
      data.paymentStatus === "PARTIALLY_PAID" &&
      data.amountPaid !== undefined &&
      data.amountPaid > totals.grandTotal
    ) {
      return NextResponse.json(
        { success: false, error: "Amount paid cannot exceed grand total" },
        { status: 400 }
      );
    }

    let paymentAmounts;
    try {
      paymentAmounts = calculatePaymentAmounts(
        totals.grandTotal,
        data.paymentStatus,
        data.amountPaid
      );
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          error: e instanceof Error ? e.message : "Invalid payment amount",
        },
        { status: 400 }
      );
    }

    const invoiceDate = new Date(data.invoiceDate);
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 7);
    const year = invoiceDate.getFullYear();

    const { invoice, linkedCustomerId, customerJustCreated } = await prisma.$transaction(
      async (tx) => {
        const resolved = await resolveInvoiceCustomer(tx, {
          customerId: data.customerId,
          customerName: data.customerName,
          customerMobile: data.customerMobile,
          customerAddress: data.customerAddress,
          customerGst: data.customerGst,
        });

        const {
          customerId,
          customerName,
          customerMobile,
          customerAddress,
          customerGst,
          customerJustCreated,
        } = resolved;

        const linkedCustomerId = customerId;

      const sequence = await tx.invoiceSequence.upsert({
        where: { year },
        update: { lastNumber: { increment: 1 } },
        create: { year, lastNumber: 1 },
      });

      const invoiceNumber = formatInvoiceNumber(year, sequence.lastNumber);

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          invoiceDate,
          dueDate,
          customerId,
          customerName,
          customerMobile,
          customerAddress,
          customerGst,
          subtotal: totals.subtotal,
          gstEnabled: totals.gstEnabled,
          cgstRate: totals.cgstRate,
          sgstRate: totals.sgstRate,
          cgstAmount: totals.cgstAmount,
          sgstAmount: totals.sgstAmount,
          totalGst: totals.totalGst,
          grandTotal: totals.grandTotal,
          amountInWords: totals.amountInWords,
          paymentStatus: data.paymentStatus,
          paymentMethod: data.paymentMethod,
          amountPaid: paymentAmounts.amountPaid,
          amountRemaining: paymentAmounts.amountRemaining,
          notes: data.notes,
          createdById: user!.id,
          items: {
            create: data.items.map((item, index) => ({
              slNo: index + 1,
              itemType: item.itemType,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.quantity * item.unitPrice,
              packageStartDate: parseOptionalDate(item.packageStartDate),
              packageEndDate: parseOptionalDate(item.packageEndDate),
              subscriptionPricingId: item.subscriptionPricingId || null,
              sectionSnapshot: item.sectionSnapshot || null,
              labelSnapshot: item.labelSnapshot || null,
              priceSnapshot: item.priceSnapshot ?? item.unitPrice,
            })),
          },
        },
        include: { items: true, customer: true },
      });
      
      return { invoice, linkedCustomerId, customerJustCreated };
      }
    );

    const invoiceNumber = invoice.invoiceNumber;

    if (customerJustCreated) {
      await recordCustomerActivity(
        prisma,
        customerJustCreated.id,
        "CUSTOMER_ADDED",
        `${customerJustCreated.name} was added to the academy`
      );
    }

    if (linkedCustomerId) {
      await recordCustomerActivity(
        prisma,
        linkedCustomerId,
        "INVOICE_CREATED",
        `Invoice ${invoiceNumber} created`
      );

      if (paymentAmounts.amountPaid > 0) {
        await recordCustomerActivity(
          prisma,
          linkedCustomerId,
          "PAYMENT_MADE",
          `Payment of ₹${paymentAmounts.amountPaid.toFixed(2)} received for ${invoiceNumber}`
        );
      }

      const hasPackage = data.items.some((item) => item.itemType === COACHING_PACKAGE_TYPE);
      if (hasPackage) {
        const packageItem = data.items.find((item) => item.itemType === COACHING_PACKAGE_TYPE);
        await recordCustomerActivity(
          prisma,
          linkedCustomerId,
          "PACKAGE_PURCHASED",
          packageItem?.description
            ? `Package purchased: ${packageItem.description}`
            : "Coaching package purchased"
        );
      }
    }

    await recordUserActivity(prisma, user!.id!, "INVOICE_CREATED", invoiceNumber);

    void logAuditEvent({
      userId: user!.id,
      username: user!.username,
      action: AUDIT_ACTIONS.INVOICE_CREATED,
      entityType: "INVOICE",
      entityId: invoice.id,
      details: {
        invoiceNumber,
        customerId: linkedCustomerId,
        totalAmount: Number(invoice.grandTotal),
      },
    });

    return NextResponse.json(serializeInvoiceForJson(invoice), { status: 201 });
  } catch (error) {
    const message = prismaErrorMessage(error);
    const status =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P1001" ? 503 : 500;
    console.error("API ERROR:", error);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
