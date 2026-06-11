import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { serializeSubscriptionPlan } from "@/lib/subscription-plans";
import { subscriptionPlanSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const planUpdateSchema = subscriptionPlanSchema.partial();

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
        ...(data.planName !== undefined ? { planName: data.planName.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description?.trim() || null }
          : {}),
        ...(data.duration !== undefined ? { duration: data.duration.trim() } : {}),
        ...(data.fees !== undefined ? { fees: data.fees } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    return NextResponse.json(serializeSubscriptionPlan(updated));
  } catch (error) {
    return apiErrorResponse(error, "Failed to update subscription plan");
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    await prisma.subscriptionPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete subscription plan");
  }
}
