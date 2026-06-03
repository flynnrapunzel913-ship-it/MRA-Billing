import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { normalizeUiPreferences, uiPreferencesSchema } from "@/lib/ui-preferences";

const profileSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  role: true,
  uiFontFamily: true,
  uiFontSize: true,
} as const;

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const row = await prisma.user.findUnique({
      where: { id: user!.id! },
      select: profileSelect,
    });

    if (!row) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const prefs = normalizeUiPreferences(row);
    return NextResponse.json({
      ...row,
      uiFontFamily: prefs.uiFontFamily,
      uiFontSize: prefs.uiFontSize,
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load profile");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = uiPreferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    if (!parsed.data.uiFontFamily && !parsed.data.uiFontSize) {
      return NextResponse.json(
        { error: "Provide uiFontFamily and/or uiFontSize" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user!.id! },
      data: {
        ...(parsed.data.uiFontFamily ? { uiFontFamily: parsed.data.uiFontFamily } : {}),
        ...(parsed.data.uiFontSize ? { uiFontSize: parsed.data.uiFontSize } : {}),
      },
      select: profileSelect,
    });

    const prefs = normalizeUiPreferences(updated);
    return NextResponse.json({
      ...updated,
      uiFontFamily: prefs.uiFontFamily,
      uiFontSize: prefs.uiFontSize,
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to update profile");
  }
}
