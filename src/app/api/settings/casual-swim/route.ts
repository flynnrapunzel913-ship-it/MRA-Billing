import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { casualSwimSettingsSchema } from "@/lib/validations";
import { toJsonNumber } from "@/lib/serialize-prisma";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
      select: { casualSwimAdultCouponRate: true, casualSwimChildCouponRate: true },
    });

    return NextResponse.json({
      casualSwimAdultCouponRate: toJsonNumber(settings?.casualSwimAdultCouponRate ?? 150),
      casualSwimChildCouponRate: toJsonNumber(settings?.casualSwimChildCouponRate ?? 100),
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load casual swim settings");
  }
}

export async function PUT(request: NextRequest) {
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
      update: {
        casualSwimAdultCouponRate: parsed.data.casualSwimAdultCouponRate,
        casualSwimChildCouponRate: parsed.data.casualSwimChildCouponRate,
      },
      create: {
        id: "default",
        casualSwimAdultCouponRate: parsed.data.casualSwimAdultCouponRate,
        casualSwimChildCouponRate: parsed.data.casualSwimChildCouponRate,
      },
      select: { casualSwimAdultCouponRate: true, casualSwimChildCouponRate: true },
    });

    return NextResponse.json({
      casualSwimAdultCouponRate: toJsonNumber(settings.casualSwimAdultCouponRate),
      casualSwimChildCouponRate: toJsonNumber(settings.casualSwimChildCouponRate),
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to update casual swim settings");
  }
}
