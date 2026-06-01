import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { serializeProduct } from "@/lib/catalog";
import { academyProductSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const parsed = academyProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const updated = await prisma.academyProduct.update({
      where: { id },
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        price: data.price,
        status: data.status,
      },
    });

    return NextResponse.json(serializeProduct(updated));
  } catch (error) {
    return apiErrorResponse(error, "Failed to update product");
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    await prisma.academyProduct.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete product");
  }
}
