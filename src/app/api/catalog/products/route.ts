import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { searchProducts, serializeProduct } from "@/lib/catalog";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const q = request.nextUrl.searchParams.get("q") ?? "";
    const rows = await searchProducts(q, true);
    return NextResponse.json(rows.map(serializeProduct));
  } catch (error) {
    return apiErrorResponse(error, "Failed to load products");
  }
}
