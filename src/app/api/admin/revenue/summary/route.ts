import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { getTodayRevenue, getWeekRevenue, getMonthRevenue } from "@/lib/revenue-analytics";
import { toKpiNumber } from "@/lib/dashboard-kpis";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const [todayRevenue, weekRevenue, monthRevenue] = await Promise.all([
      getTodayRevenue(),
      getWeekRevenue(),
      getMonthRevenue(),
    ]);

    return NextResponse.json({
      todayRevenue: toKpiNumber(todayRevenue),
      weekRevenue: toKpiNumber(weekRevenue),
      monthRevenue: toKpiNumber(monthRevenue),
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load revenue summary");
  }
}
