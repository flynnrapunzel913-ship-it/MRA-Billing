import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { AUDIT_ACTIONS, logAuditEvent } from "@/lib/audit-log";
import { parseCasualSwimRatesFromSettings } from "@/lib/casual-swim";
import { casualSwimSettingsSchema } from "@/lib/validations";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const settings = await prisma.settings.findUnique({ where: { id: "default" } });
    if (!settings) {
      return NextResponse.json({
        casualSwimAdultRatePerHour: 150,
        casualSwimChildRatePerHour: 100,
        casualSwimCapRentalPrice: 150,
        casualSwimShortsRentalPrice: 200,
        casualSwimGogglesRentalPrice: 150,
      });
    }

    const rates = parseCasualSwimRatesFromSettings(settings);
    return NextResponse.json({
      casualSwimAdultRatePerHour: rates.adultRatePerHour,
      casualSwimChildRatePerHour: rates.childRatePerHour,
      casualSwimCapRentalPrice: rates.capRentalPrice,
      casualSwimShortsRentalPrice: rates.shortsRentalPrice,
      casualSwimGogglesRentalPrice: rates.gogglesRentalPrice,
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load casual swim settings");
  }
}

export async function PUT(request: Request) {
  try {
    const { error, user } = await requireAdmin();
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
      update: parsed.data,
      create: {
        id: "default",
        academyName: "MR Academy",
        address: "",
        phonePrimary: "",
        email: "",
        gstNumber: "",
        logoUrl: "/branding/logo.png",
        footerImageUrl: "/branding/footer-curves.jpeg",
        headerImageUrl: "/branding/address-panel.jpeg",
        brandColor: "#0070C0",
        termsAndConditions:
          "1. Fees once paid are non-refundable.\n2. Subject to academy rules.\n3. This is a computer generated invoice.",
        ...parsed.data,
      },
    });

    void logAuditEvent({
      userId: user!.id,
      username: user!.username,
      action: AUDIT_ACTIONS.CASUAL_SWIM_SETTINGS_UPDATED,
      entityType: "SETTINGS",
      entityId: "default",
      details: parsed.data,
    });

    const rates = parseCasualSwimRatesFromSettings(settings);
    return NextResponse.json({
      casualSwimAdultRatePerHour: rates.adultRatePerHour,
      casualSwimChildRatePerHour: rates.childRatePerHour,
      casualSwimCapRentalPrice: rates.capRentalPrice,
      casualSwimShortsRentalPrice: rates.shortsRentalPrice,
      casualSwimGogglesRentalPrice: rates.gogglesRentalPrice,
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to update casual swim settings");
  }
}
