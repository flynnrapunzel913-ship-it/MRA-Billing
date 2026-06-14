import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { listSubscriptionPlans, serializeSubscriptionPlan } from "@/lib/subscription-plans";
import { subscriptionPlanSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { formatDurationLabel } from "@/lib/subscription-duration";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const q = request.nextUrl.searchParams.get("q") ?? "";
    const rows = await listSubscriptionPlans({ q });
    return NextResponse.json(rows);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load subscription plans");
  }
}

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
        planName: data.planName.trim(),
        description: data.description?.trim() || null,
        duration: formatDurationLabel(data.durationValue, data.durationUnit),
        durationValue: data.durationValue,
        durationUnit: data.durationUnit,
        fees: data.fees,
        isActive: data.isActive,
      },
    });

    return NextResponse.json(serializeSubscriptionPlan(created), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Failed to create subscription plan");
  }
}
