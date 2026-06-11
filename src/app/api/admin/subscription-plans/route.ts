import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { serializeCategory } from "@/lib/subscription-catalog";
import { subscriptionPlanSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const parsed = subscriptionPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const created = await prisma.subscriptionPlan.create({
      data: {
        categoryId: data.categoryId,
        planName: data.planName.trim(),
        price: data.price,
        durationValue: data.durationValue ?? null,
        durationUnit: data.durationUnit ?? null,
        sessionCount: data.sessionCount ?? null,
        validityDays: data.validityDays ?? null,
        description: data.description?.trim() || null,
        isActive: data.isActive,
      },
      include: { category: true },
    });

    const category = await prisma.subscriptionCategory.findUnique({
      where: { id: created.categoryId },
      include: { plans: { orderBy: [{ price: "asc" }, { planName: "asc" }] } },
    });

    return NextResponse.json(
      category ? serializeCategory(category) : { planId: created.id },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Failed to create subscription plan");
  }
}
