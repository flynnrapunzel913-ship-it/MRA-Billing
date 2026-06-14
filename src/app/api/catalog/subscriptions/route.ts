import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { listSubscriptionPlans } from "@/lib/subscription-plans";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const q = request.nextUrl.searchParams.get("q") ?? "";
    const rows = await listSubscriptionPlans({ q, activeOnly: true });

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        name: row.planName,
        planName: row.planName,
        description: row.description,
        duration: row.duration,
        durationValue: row.durationValue,
        durationUnit: row.durationUnit,
        price: row.fees,
        fees: row.fees,
      }))
    );
  } catch (error) {
    return apiErrorResponse(error, "Failed to load subscription plans");
  }
}
