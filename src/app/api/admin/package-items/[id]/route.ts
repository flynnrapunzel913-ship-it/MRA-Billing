import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { serializePackageGroup } from "@/lib/package-catalog";
import { packageItemSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const itemUpdateSchema = packageItemSchema.omit({ groupId: true }).partial().extend({
  groupId: packageItemSchema.shape.groupId.optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const parsed = itemUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const updated = await prisma.packageItem.update({
      where: { id },
      data: {
        ...(data.groupId ? { groupId: data.groupId } : {}),
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.description !== undefined
          ? { description: data.description?.trim() || null }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    const group = await prisma.packageGroup.findUnique({
      where: { id: updated.groupId },
      include: { items: { orderBy: [{ price: "asc" }, { title: "asc" }] } },
    });

    return NextResponse.json(group ? serializePackageGroup(group) : { success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to update package item");
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    await prisma.packageItem.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to disable package item");
  }
}
