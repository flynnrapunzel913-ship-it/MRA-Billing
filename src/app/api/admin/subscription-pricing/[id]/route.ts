import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { serializePricingRow } from "@/lib/subscription-pricing";
import { subscriptionPricingSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const pricingUpdateSchema = subscriptionPricingSchema.partial();

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const parsed = pricingUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const updated = await prisma.subscriptionPricing.update({
      where: { id },
      data: {
        ...(data.section !== undefined ? { section: data.section } : {}),
        ...(data.label !== undefined ? { label: data.label.trim() } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.description !== undefined
          ? { description: data.description?.trim() || null }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    return NextResponse.json(serializePricingRow(updated));
  } catch (error) {
    return apiErrorResponse(error, "Failed to update pricing entry");
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    await prisma.subscriptionPricing.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete pricing entry");
  }
}
