import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { casualSwimSettingsSchema } from "@/lib/validations";
import { toJsonNumber } from "@/lib/serialize-prisma";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
      select: { casualSwimCouponRate: true },
    });

    return NextResponse.json({
      casualSwimCouponRate: toJsonNumber(settings?.casualSwimCouponRate ?? 150),
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load casual swim settings");
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

    const parsed = casualSwimSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const settings = await prisma.settings.upsert({
      where: { id: "default" },
      update: { casualSwimCouponRate: parsed.data.casualSwimCouponRate },
      create: {
        id: "default",
        casualSwimCouponRate: parsed.data.casualSwimCouponRate,
      },
      select: { casualSwimCouponRate: true },
    });

    return NextResponse.json({
      casualSwimCouponRate: toJsonNumber(settings.casualSwimCouponRate),
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to update casual swim settings");
  }
}
