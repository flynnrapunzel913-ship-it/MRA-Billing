import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { listPackageGroups } from "@/lib/package-catalog";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const q = request.nextUrl.searchParams.get("q") ?? "";
    const format = request.nextUrl.searchParams.get("format");

    const groups = await listPackageGroups({ q, activeOnly: true });

    if (format === "flat") {
      return NextResponse.json(
        groups.flatMap((group) =>
          group.items.map((item) => ({
            ...item,
            groupName: group.name,
          }))
        )
      );
    }

    return NextResponse.json(groups);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load packages");
  }
}
