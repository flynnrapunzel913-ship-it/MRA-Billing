import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { groupPricingBySection, listSubscriptionPricing } from "@/lib/subscription-pricing";

/** Legacy route — returns grouped subscription pricing. */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const q = request.nextUrl.searchParams.get("q") ?? "";
    const rows = await listSubscriptionPricing({ q });
    return NextResponse.json(groupPricingBySection(rows));
  } catch (error) {
    return apiErrorResponse(error, "Failed to load subscriptions");
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Use POST /api/admin/subscription-pricing" },
    { status: 410 }
  );
}
