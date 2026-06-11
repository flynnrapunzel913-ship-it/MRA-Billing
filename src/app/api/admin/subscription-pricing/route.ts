import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import {
  groupPricingBySection,
  listSubscriptionPricing,
  serializePricingRow,
} from "@/lib/subscription-pricing";
import { subscriptionPricingSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const q = request.nextUrl.searchParams.get("q") ?? "";
    const format = request.nextUrl.searchParams.get("format");

    const rows = await listSubscriptionPricing({ q });

    if (format === "grouped") {
      return NextResponse.json(groupPricingBySection(rows));
    }

    return NextResponse.json(rows);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load subscription pricing");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const parsed = subscriptionPricingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const created = await prisma.subscriptionPricing.create({
      data: {
        section: data.section,
        label: data.label.trim(),
        price: data.price,
        description: data.description?.trim() || null,
        isActive: data.isActive,
      },
    });

    return NextResponse.json(serializePricingRow(created), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Failed to create pricing entry");
  }
}
