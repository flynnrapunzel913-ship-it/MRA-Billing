import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(
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

    if (!customer || !customer.deletedAt) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    await prisma.customer.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to restore customer");
  }
}
