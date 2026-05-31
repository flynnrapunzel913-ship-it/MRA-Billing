import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status");

  const customers = await prisma.customer.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { mobile: { contains: q } },
                { membershipId: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        status ? { status: status as "ACTIVE" | "INACTIVE" | "SUSPENDED" } : {},
      ],
    },
    include: {
      _count: { select: { invoices: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { customerSchema } = await import("@/lib/validations");
  const { generateMembershipId } = await import("@/lib/utils");

  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const membershipId = data.membershipId || generateMembershipId();

  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      mobile: data.mobile || null,
      email: data.email || null,
      address: data.address || null,
      gstNumber: data.gstNumber || null,
      membershipId,
      dateJoined: data.dateJoined ? new Date(data.dateJoined) : new Date(),
      status: data.status,
    },
  });

  return NextResponse.json(customer, { status: 201 });
}
