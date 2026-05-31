import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import {
  calculateInvoiceTotals,
  calculatePaymentAmounts,
  formatInvoiceNumber,
} from "@/lib/invoice-utils";
import { generateMembershipId } from "@/lib/utils";

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
  const { error } = await requireAuth();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q") || "";
  const paymentStatus = searchParams.get("paymentStatus");

  const invoices = await prisma.invoice.findMany({
    where: {
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

  return NextResponse.json(invoices);
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { invoiceSchema } = await import("@/lib/validations");
  const parsed = invoiceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const gstSettings = await getGstSettings();
  const totals = calculateInvoiceTotals(data.items, gstSettings);

  if (
    data.paymentStatus === "PARTIALLY_PAID" &&
    data.amountPaid !== undefined &&
    data.amountPaid > totals.grandTotal
  ) {
    return NextResponse.json({ error: "Amount paid cannot exceed grand total" }, { status: 400 });
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
      { error: e instanceof Error ? e.message : "Invalid payment amount" },
      { status: 400 }
    );
  }

  const invoiceDate = new Date(data.invoiceDate);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 7);
  const year = invoiceDate.getFullYear();

  const invoice = await prisma.$transaction(async (tx) => {
    let customerId: string | null = null;

    if (data.saveCustomer) {
      const customer = await tx.customer.create({
        data: {
          name: data.customerName,
          mobile: data.customerMobile || null,
          address: data.customerAddress || null,
          gstNumber: data.customerGst || null,
          membershipId: generateMembershipId(),
        },
      });
      customerId = customer.id;
    }

    const sequence = await tx.invoiceSequence.upsert({
      where: { year },
      update: { lastNumber: { increment: 1 } },
      create: { year, lastNumber: 1 },
    });

    const invoiceNumber = formatInvoiceNumber(year, sequence.lastNumber);

    return tx.invoice.create({
      data: {
        invoiceNumber,
        invoiceDate,
        dueDate,
        customerId,
        customerName: data.customerName,
        customerMobile: data.customerMobile || null,
        customerAddress: data.customerAddress || null,
        customerGst: data.customerGst || null,
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
          })),
        },
      },
      include: { items: true, customer: true },
    });
  });

  return NextResponse.json(invoice, { status: 201 });
}
