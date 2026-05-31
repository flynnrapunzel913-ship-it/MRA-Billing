import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      invoices: {
        orderBy: { invoiceDate: "desc" },
        include: { items: true },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json(customer);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
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
      mobile: data.mobile || null,
      email: data.email || null,
      address: data.address || null,
      gstNumber: data.gstNumber || null,
      status: data.status,
      ...(data.dateJoined ? { dateJoined: new Date(data.dateJoined) } : {}),
    },
  });

  return NextResponse.json(customer);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  await prisma.customer.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
