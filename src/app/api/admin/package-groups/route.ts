import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { listPackageGroups, serializePackageGroup } from "@/lib/package-catalog";
import { packageGroupSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const q = request.nextUrl.searchParams.get("q") ?? "";
    const rows = await listPackageGroups({ q, includeInactiveItems: true });
    return NextResponse.json(rows);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load package groups");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const parsed = packageGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const created = await prisma.packageGroup.create({
      data: {
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
        isActive: parsed.data.isActive,
      },
      include: { items: true },
    });

    return NextResponse.json(serializePackageGroup(created), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Failed to create package group");
  }
}
