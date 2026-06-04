import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const settings = await prisma.settings.findUnique({ where: { id: "default" } });
    return NextResponse.json(settings);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load settings");
  }
}

export async function PUT(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { settingsSchema } = await import("@/lib/validations");
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const settings = await prisma.settings.upsert({
      where: { id: "default" },
      update: parsed.data,
      create: { id: "default", ...parsed.data },
    });

    return NextResponse.json(settings);
  } catch (error) {
    return apiErrorResponse(error, "Failed to update settings");
  }
}
