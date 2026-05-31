import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { updateUserSchema, resetPasswordSchema } from "@/lib/validations";
import { recordUserActivity } from "@/lib/user-activity";
import {
  listUsers,
  supportsUserStatus,
  updateUserRecord,
} from "@/lib/user-queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const users = await listUsers();
    const user = users.find((u) => u.id === id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load user");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user: admin } = await requireAdmin();
    if (error) return error;

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (admin!.id === id && data.status === "DISABLED") {
      return NextResponse.json({ error: "You cannot disable your own account" }, { status: 400 });
    }

    const emailTaken = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase(), NOT: { id } },
    });
    if (emailTaken) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash =
      data.password && data.password.length >= 6
        ? await bcrypt.hash(data.password, 10)
        : undefined;

    const previousStatus =
      "status" in existing && existing.status ? existing.status : "ACTIVE";

    const updated = await prisma.$transaction(async (tx) => {
      const user = await updateUserRecord(
        id,
        {
          name: data.name.trim(),
          email: data.email.toLowerCase(),
          role: data.role,
          status: data.status,
          password: passwordHash,
        },
        tx
      );

      if (passwordHash) {
        await recordUserActivity(
          tx,
          admin!.id!,
          "PASSWORD_RESET",
          `Reset password for ${user.name}`
        );
      }

      if (previousStatus !== data.status) {
        await recordUserActivity(
          tx,
          admin!.id!,
          data.status === "DISABLED" ? "USER_DISABLED" : "USER_ENABLED",
          `${data.status === "DISABLED" ? "Disabled" : "Enabled"} ${user.name}`
        );
      }

      return user;
    });

    return NextResponse.json(updated);
  } catch (error) {
    return apiErrorResponse(error, "Failed to update user");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user: admin } = await requireAdmin();
    if (error) return error;

    const { id } = await params;

    if (admin!.id === id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (existing.role === "ADMIN") {
      const withStatus = await supportsUserStatus();
      const adminCount = withStatus
        ? await prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } })
        : await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last active administrator" },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await recordUserActivity(
        tx,
        admin!.id!,
        "USER_DELETED",
        `Deleted user ${existing.name}`
      );
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete user");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user: admin } = await requireAdmin();
    if (error) return error;

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hashed = await bcrypt.hash(parsed.data.password, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { password: hashed },
      });
      await recordUserActivity(
        tx,
        admin!.id!,
        "PASSWORD_RESET",
        `Reset password for ${existing.name}`
      );
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to reset password");
  }
}
