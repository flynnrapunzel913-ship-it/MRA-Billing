import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { recordCustomerActivity } from "@/lib/customer-activity";
import { recordUserActivity } from "@/lib/user-activity";
import { listCustomersWithInvoiceCounts } from "@/lib/customer-queries";

export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status");
    const view = searchParams.get("view") === "deleted" ? "deleted" : "active";

    if (view === "deleted" && user!.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const customers = await listCustomersWithInvoiceCounts(
      {
        AND: [
          q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { mobile: { contains: q } },
                  { membershipId: { contains: q, mode: "insensitive" } },
                ],
              }
            : {},
          status ? { status: status as "ACTIVE" | "INACTIVE" | "SUSPENDED" } : {},
        ],
      },
      { take: q ? 20 : undefined, view }
    );

    return NextResponse.json(customers);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load customers");
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
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

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
        mobile: data.mobile,
        address: data.address || null,
        emergencyContact: data.emergencyContact || null,
        parentName: data.parentName || null,
        gstNumber: data.gstNumber || null,
        membershipId,
        dateJoined: data.dateJoined ? new Date(data.dateJoined) : new Date(),
        status: data.status,
      },
    });

    await recordCustomerActivity(
      prisma,
      customer.id,
      "CUSTOMER_ADDED",
      `${customer.name} was added to the academy`
    );

    if (user?.id) {
      await recordUserActivity(prisma, user.id, "CUSTOMER_CREATED", customer.name);
    }

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Failed to create customer");
  }
}
