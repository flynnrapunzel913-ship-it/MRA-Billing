import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { getTransactionsForDay, getRecentTransactions } from "@/lib/revenue-analytics";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const params = request.nextUrl.searchParams;
    const date = params.get("date");
    const recent = params.get("recent");

    if (recent) {
      const limit = Math.min(Math.max(Number(recent) || 20, 1), 100);
      const transactions = await getRecentTransactions(limit);
      return NextResponse.json({ transactions });
    }

    if (!date) {
      return NextResponse.json({ error: "date or recent is required" }, { status: 400 });
    }

    const transactions = await getTransactionsForDay(date);
    return NextResponse.json({ date, transactions });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load transactions");
  }
}
