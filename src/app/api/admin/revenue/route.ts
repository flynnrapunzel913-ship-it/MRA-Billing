import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import {
  getRevenueAnalytics,
  type RevenuePeriod,
} from "@/lib/revenue-analytics";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const params = request.nextUrl.searchParams;
    const period = (params.get("period") || "daily") as RevenuePeriod;
    const from = params.get("from");
    const to = params.get("to");

    if (!["daily", "weekly", "monthly"].includes(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    const rows = await getRevenueAnalytics(period, from, to);

    return NextResponse.json({
      period,
      from,
      to,
      rows,
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load revenue logs");
  }
}
