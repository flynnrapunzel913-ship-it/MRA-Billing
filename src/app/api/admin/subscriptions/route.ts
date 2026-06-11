import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { listPackageGroups } from "@/lib/package-catalog";

/** Legacy route — returns package groups (use /api/admin/package-groups). */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const q = request.nextUrl.searchParams.get("q") ?? "";
    const rows = await listPackageGroups({ q, includeInactiveItems: true });
    return NextResponse.json(rows);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load packages");
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Use POST /api/admin/package-groups or /api/admin/package-items" },
    { status: 410 }
  );
}
