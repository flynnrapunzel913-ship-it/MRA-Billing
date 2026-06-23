import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { hashPassword } from "@/lib/security/password-policy";
import { createUserSchema } from "@/lib/validations";
import { recordUserActivity } from "@/lib/user-activity";
import { createUserRecord, listUsers } from "@/lib/user-queries";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const users = await listUsers();
    return NextResponse.json(users);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load users");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, user: admin } = await requireAdmin();
    if (error) return error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const existing = await prisma.user.findUnique({
      where: { username: data.username.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json({ error: "Username already in use" }, { status: 409 });
    }

    const hashed = await hashPassword(data.password);

    const created = await prisma.$transaction(async (tx) => {
      const user = await createUserRecord(
        {
          username: data.username.toLowerCase(),
          password: hashed,
          role: data.role,
        },
        tx
      );

      await recordUserActivity(
        tx,
        admin!.id!,
        "USER_CREATED",
        `Created ${data.role.toLowerCase()} account for ${user.username}`
      );

      return user;
    });

    return NextResponse.json(
      { ...created, status: "status" in created ? created.status : "ACTIVE" },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Failed to create user");
  }
}
