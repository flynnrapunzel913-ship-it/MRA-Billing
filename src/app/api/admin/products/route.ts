import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { searchProducts, serializeProduct } from "@/lib/catalog";
import { academyProductSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const q = request.nextUrl.searchParams.get("q") ?? "";
    const rows = await searchProducts(q, false);
    return NextResponse.json(rows.map(serializeProduct));
  } catch (error) {
    return apiErrorResponse(error, "Failed to load products");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const parsed = academyProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const created = await prisma.academyProduct.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        price: data.price,
        status: data.status,
      },
    });

    return NextResponse.json(serializeProduct(created), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Failed to create product");
  }
}
