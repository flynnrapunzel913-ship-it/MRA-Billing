import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { listSubscriptionCategories } from "@/lib/subscription-catalog";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const q = request.nextUrl.searchParams.get("q") ?? "";
    const format = request.nextUrl.searchParams.get("format");

    const categories = await listSubscriptionCategories({ q, activeOnly: true });

    if (format === "flat") {
      return NextResponse.json(
        categories.flatMap((category) =>
          category.plans.map((plan) => ({
            ...plan,
            categoryName: category.name,
          }))
        )
      );
    }

    return NextResponse.json(categories);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load subscriptions");
  }
}
