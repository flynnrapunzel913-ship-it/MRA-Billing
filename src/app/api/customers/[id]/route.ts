import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireOperationalAccess } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { getActiveInvoiceWhere } from "@/lib/invoice-filters";
import { getCustomerWithDetails } from "@/lib/customer-queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireOperationalAccess();
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
    const { error } = await requireOperationalAccess();
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

    const existing = await getCustomerWithDetails(id);
    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const data = parsed.data;
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        mobile: data.mobile,
        address: data.address?.trim() || null,
        emergencyContact: data.emergencyContact?.trim() || null,
        parentName: data.parentName?.trim() || null,
        gstNumber: data.gstNumber?.trim() || null,
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
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });

    if (!customer || customer.deletedAt) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete customer");
  }
}
