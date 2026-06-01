import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { searchSubscriptions, serializeSubscription } from "@/lib/catalog";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const q = request.nextUrl.searchParams.get("q") ?? "";
    const rows = await searchSubscriptions(q, true);
    return NextResponse.json(rows.map(serializeSubscription));
  } catch (error) {
    return apiErrorResponse(error, "Failed to load subscriptions");
  }
}
