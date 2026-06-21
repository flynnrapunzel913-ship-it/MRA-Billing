import { describe, expect, it } from "vitest";
import {
  calculateCasualSwimCouponRevenue,
  calculateCasualSwimDualCouponRevenue,
} from "@/lib/casual-swim-coupon";

describe("calculateCasualSwimCouponRevenue", () => {
  it("computes coupons used and revenue for a single book", () => {
    const result = calculateCasualSwimCouponRevenue(100, 120, 150);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.couponsUsed).toBe(20);
    expect(result.result.revenue).toBe(3000);
    expect(result.result.couponRate).toBe(150);
  });

  it("rejects when last coupon is below previous closing", () => {
    const result = calculateCasualSwimCouponRevenue(120, 100, 150);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBeDefined();
  });
});

describe("calculateCasualSwimDualCouponRevenue", () => {
  it("computes both books and total casual swim revenue", () => {
    const result = calculateCasualSwimDualCouponRevenue({
      previousAbove5: 100,
      lastCouponAbove5: 120,
      previousBelow5: 50,
      lastCouponBelow5: 65,
      adultCouponRate: 150,
      childCouponRate: 100,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.above5.couponsUsed).toBe(20);
    expect(result.result.above5.revenue).toBe(3000);
    expect(result.result.below5.couponsUsed).toBe(15);
    expect(result.result.below5.revenue).toBe(1500);
    expect(result.result.couponsUsed).toBe(35);
    expect(result.result.revenue).toBe(4500);
  });

  it("validates above 5 and below 5 independently", () => {
    const result = calculateCasualSwimDualCouponRevenue({
      previousAbove5: 120,
      lastCouponAbove5: 100,
      previousBelow5: 50,
      lastCouponBelow5: 65,
      adultCouponRate: 150,
      childCouponRate: 100,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("Above 5 Years");
  });
});
