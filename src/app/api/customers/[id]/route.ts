import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { getActiveInvoiceWhere } from "@/lib/invoice-filters";
import { getCustomerWithDetails } from "@/lib/customer-queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const customer = await getCustomerWithDetails(id);

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const invoiceWhere = await getActiveInvoiceWhere();
    const invoiceStats = await prisma.invoice.aggregate({
      where: { customerId: id, ...invoiceWhere },
      _count: { _all: true },
      _sum: {
        grandTotal: true,
        amountPaid: true,
        amountRemaining: true,
      },
      _max: { invoiceDate: true },
    });

    const stats = {
      totalInvoices: invoiceStats._count._all,
      totalAmountBilled: Number(invoiceStats._sum.grandTotal || 0),
      totalAmountPaid: Number(invoiceStats._sum.amountPaid || 0),
      outstandingBalance: Number(invoiceStats._sum.amountRemaining || 0),
      lastInvoiceDate: invoiceStats._max.invoiceDate,
    };

    return NextResponse.json({
      ...customer,
      activities: "activities" in customer ? customer.activities : [],
      stats,
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load customer");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { customerSchema } = await import("@/lib/validations");
    const parsed = customerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        mobile: data.mobile,
        status: data.status,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    return apiErrorResponse(error, "Failed to update customer");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete customer");
  }
}
