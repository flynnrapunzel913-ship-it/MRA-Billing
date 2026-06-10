import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import {
  getFinancialSummary,
  type FinancialSummaryPeriod,
} from "@/lib/financial-summary";

const VALID_PERIODS: FinancialSummaryPeriod[] = ["today", "week", "month"];

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const rawPeriod = request.nextUrl.searchParams.get("period") || "today";
    if (!VALID_PERIODS.includes(rawPeriod as FinancialSummaryPeriod)) {
      return NextResponse.json(
        { error: "Invalid period. Use today, week, or month." },
        { status: 400 }
      );
    }

    const period = rawPeriod as FinancialSummaryPeriod;
    const summary = await getFinancialSummary(period);

    return NextResponse.json(summary);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load financial summary");
  }
}
