import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { listPricingCatalog } from "@/lib/subscription-pricing";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const q = request.nextUrl.searchParams.get("q") ?? "";
    const groups = await listPricingCatalog({ q, activeOnly: true });
    return NextResponse.json(groups);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load subscription pricing");
  }
}
