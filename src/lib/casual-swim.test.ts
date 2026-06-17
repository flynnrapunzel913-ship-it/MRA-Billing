import { describe, expect, it } from "vitest";
import { calculateCasualSwimBill } from "@/lib/casual-swim";

describe("calculateCasualSwimBill", () => {
  const rates = {
    adultRatePerHour: 150,
    childRatePerHour: 100,
    capRentalPrice: 150,
    shortsRentalPrice: 200,
    gogglesRentalPrice: 150,
  };

  it("calculates swimming and rental charges", () => {
    const result = calculateCasualSwimBill(
      {
        hours: 2,
        adultCount: 2,
        childCount: 1,
        capQty: 1,
        shortsQty: 0,
        gogglesQty: 1,
      },
      rates
    );

    expect(result.adultCharge).toBe(600);
    expect(result.childCharge).toBe(200);
    expect(result.swimmingAmount).toBe(800);
    expect(result.capCharge).toBe(150);
    expect(result.gogglesCharge).toBe(150);
    expect(result.rentalAmount).toBe(300);
    expect(result.totalAmount).toBe(1100);
  });
});
