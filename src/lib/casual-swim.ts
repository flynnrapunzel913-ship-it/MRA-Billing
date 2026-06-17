import { toJsonNumber } from "@/lib/serialize-prisma";

export type CasualSwimRates = {
  adultRatePerHour: number;
  childRatePerHour: number;
  capRentalPrice: number;
  shortsRentalPrice: number;
  gogglesRentalPrice: number;
};

export type CasualSwimBillInput = {
  hours: number;
  adultCount: number;
  childCount: number;
  capQty: number;
  shortsQty: number;
  gogglesQty: number;
};

export type CasualSwimBillBreakdown = {
  adultCharge: number;
  childCharge: number;
  swimmingAmount: number;
  capCharge: number;
  shortsCharge: number;
  gogglesCharge: number;
  rentalAmount: number;
  totalAmount: number;
};

export function parseCasualSwimRatesFromSettings(row: {
  casualSwimAdultRatePerHour: unknown;
  casualSwimChildRatePerHour: unknown;
  casualSwimCapRentalPrice: unknown;
  casualSwimShortsRentalPrice: unknown;
  casualSwimGogglesRentalPrice: unknown;
}): CasualSwimRates {
  return {
    adultRatePerHour: toJsonNumber(row.casualSwimAdultRatePerHour),
    childRatePerHour: toJsonNumber(row.casualSwimChildRatePerHour),
    capRentalPrice: toJsonNumber(row.casualSwimCapRentalPrice),
    shortsRentalPrice: toJsonNumber(row.casualSwimShortsRentalPrice),
    gogglesRentalPrice: toJsonNumber(row.casualSwimGogglesRentalPrice),
  };
}

export function calculateCasualSwimBill(
  input: CasualSwimBillInput,
  rates: CasualSwimRates
): CasualSwimBillBreakdown {
  const adultCharge = input.adultCount * rates.adultRatePerHour * input.hours;
  const childCharge = input.childCount * rates.childRatePerHour * input.hours;
  const swimmingAmount = adultCharge + childCharge;

  const capCharge = input.capQty * rates.capRentalPrice;
  const shortsCharge = input.shortsQty * rates.shortsRentalPrice;
  const gogglesCharge = input.gogglesQty * rates.gogglesRentalPrice;
  const rentalAmount = capCharge + shortsCharge + gogglesCharge;

  return {
    adultCharge,
    childCharge,
    swimmingAmount,
    capCharge,
    shortsCharge,
    gogglesCharge,
    rentalAmount,
    totalAmount: swimmingAmount + rentalAmount,
  };
}

export async function getCasualSwimRates() {
  const { prisma } = await import("@/lib/prisma");
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!settings) {
    return {
      adultRatePerHour: 150,
      childRatePerHour: 100,
      capRentalPrice: 150,
      shortsRentalPrice: 200,
      gogglesRentalPrice: 150,
    } satisfies CasualSwimRates;
  }
  return parseCasualSwimRatesFromSettings(settings);
}

/**
 * @see casual-swim-ticket-number-dev.ts — development numbering (replace before production).
 */
export { allocateCasualSwimTicketNumber } from "@/lib/casual-swim-ticket-number-dev";
