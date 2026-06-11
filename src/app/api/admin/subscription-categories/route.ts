import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { listSubscriptionCategories, serializeCategory } from "@/lib/subscription-catalog";
import { subscriptionCategorySchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const q = request.nextUrl.searchParams.get("q") ?? "";
    const rows = await listSubscriptionCategories({ q, includeInactivePlans: true });
    return NextResponse.json(rows);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load subscription categories");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const parsed = subscriptionCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const created = await prisma.subscriptionCategory.create({
      data: {
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
        isActive: parsed.data.isActive,
      },
      include: { plans: true },
    });

    return NextResponse.json(serializeCategory(created), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Failed to create subscription category");
  }
}
