import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { serializePackageGroup } from "@/lib/package-catalog";
import { packageItemSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const parsed = packageItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const created = await prisma.packageItem.create({
      data: {
        groupId: data.groupId,
        title: data.title.trim(),
        price: data.price,
        description: data.description?.trim() || null,
        isActive: data.isActive,
      },
    });

    const group = await prisma.packageGroup.findUnique({
      where: { id: created.groupId },
      include: { items: { orderBy: [{ price: "asc" }, { title: "asc" }] } },
    });

    return NextResponse.json(
      group ? serializePackageGroup(group) : { itemId: created.id },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Failed to create package item");
  }
}
