import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { serializeCategory } from "@/lib/subscription-catalog";
import { subscriptionPlanSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const planUpdateSchema = subscriptionPlanSchema.omit({ categoryId: true }).partial().extend({
  categoryId: subscriptionPlanSchema.shape.categoryId.optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const parsed = planUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(data.categoryId ? { categoryId: data.categoryId } : {}),
        ...(data.planName !== undefined ? { planName: data.planName.trim() } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.durationValue !== undefined ? { durationValue: data.durationValue } : {}),
        ...(data.durationUnit !== undefined ? { durationUnit: data.durationUnit } : {}),
        ...(data.sessionCount !== undefined ? { sessionCount: data.sessionCount } : {}),
        ...(data.validityDays !== undefined ? { validityDays: data.validityDays } : {}),
        ...(data.description !== undefined
          ? { description: data.description?.trim() || null }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    const category = await prisma.subscriptionCategory.findUnique({
      where: { id: updated.categoryId },
      include: { plans: { orderBy: [{ price: "asc" }, { planName: "asc" }] } },
    });

    return NextResponse.json(category ? serializeCategory(category) : { success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to update subscription plan");
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    await prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to disable subscription plan");
  }
}
