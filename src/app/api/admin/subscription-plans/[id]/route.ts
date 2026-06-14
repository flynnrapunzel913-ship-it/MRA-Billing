import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { serializeSubscriptionPlan } from "@/lib/subscription-plans";
import { subscriptionPlanSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { formatPlanCoverageSummary } from "@/lib/subscription-duration";

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

    const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const durationValue = data.durationValue ?? undefined;
    const durationUnit = data.durationUnit ?? undefined;
    const usageDays = data.usageDays !== undefined ? data.usageDays : undefined;
    const nextDurationValue = durationValue ?? existing.durationValue;
    const nextDurationUnit = durationUnit ?? existing.durationUnit;
    const nextUsageDays = usageDays !== undefined ? usageDays : existing.usageDays;

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(data.planName !== undefined ? { planName: data.planName.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description?.trim() || null }
          : {}),
        ...(usageDays !== undefined ? { usageDays } : {}),
        ...(durationValue !== undefined && durationUnit !== undefined
          ? {
              durationValue,
              durationUnit,
            }
          : {}),
        ...(usageDays !== undefined ||
        (durationValue !== undefined && durationUnit !== undefined)
          ? {
              duration: formatPlanCoverageSummary({
                usageDays: nextUsageDays,
                durationValue: nextDurationValue,
                durationUnit: nextDurationUnit,
              }),
            }
          : {}),
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
