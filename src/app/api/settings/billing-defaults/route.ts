import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";

/** Minimal billing defaults for invoice creation (all authenticated staff). */
export async function GET() {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
      select: {
        gstEnabled: true,
        defaultCgstRate: true,
        defaultSgstRate: true,
      },
    });

    return NextResponse.json({
      gstEnabled: settings?.gstEnabled ?? true,
      defaultCgstRate: Number(settings?.defaultCgstRate ?? 0),
      defaultSgstRate: Number(settings?.defaultSgstRate ?? 0),
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load billing defaults");
  }
}
