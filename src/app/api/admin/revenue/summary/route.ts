import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { getTodayRevenue, getYesterdayCollectedRevenue } from "@/lib/revenue-analytics";
import { toKpiNumber } from "@/lib/dashboard-kpis";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const [todayRevenue, yesterdayCollectedRevenue] = await Promise.all([
      getTodayRevenue(),
      getYesterdayCollectedRevenue(),
    ]);

    return NextResponse.json({
      todayRevenue: toKpiNumber(todayRevenue),
      yesterdayCollectedRevenue: toKpiNumber(yesterdayCollectedRevenue),
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load revenue summary");
  }
}
