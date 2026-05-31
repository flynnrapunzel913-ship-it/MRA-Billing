import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
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
}
