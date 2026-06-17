import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireCasualSwimAccess } from "@/lib/auth/guards";
import { getCasualSwimRates } from "@/lib/casual-swim";

export async function GET() {
  try {
    const { error } = await requireCasualSwimAccess();
    if (error) return error;

    const rates = await getCasualSwimRates();
    return NextResponse.json({
      adultRatePerHour: rates.adultRatePerHour,
      childRatePerHour: rates.childRatePerHour,
      capRentalPrice: rates.capRentalPrice,
      shortsRentalPrice: rates.shortsRentalPrice,
      gogglesRentalPrice: rates.gogglesRentalPrice,
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load casual swim configuration");
  }
}
