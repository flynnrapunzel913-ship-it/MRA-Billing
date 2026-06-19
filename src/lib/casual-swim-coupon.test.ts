import { describe, expect, it } from "vitest";
import {
  calculateCasualSwimCouponRevenue,
  COUPON_CLOSING_VALIDATION_ERROR,
} from "@/lib/casual-swim-coupon";

describe("calculateCasualSwimCouponRevenue", () => {
  it("counts coupons used as last minus previous (exclusive lower bound)", () => {
    const result = calculateCasualSwimCouponRevenue(100, 120, 150);
    expect(result).toEqual({
      ok: true,
      result: {
        previousClosingCoupon: 100,
        lastCouponNumber: 120,
        couponRate: 150,
        couponsUsed: 20,
        revenue: 3000,
      },
    });
  });

  it("allows zero coupons when last equals previous", () => {
    const result = calculateCasualSwimCouponRevenue(120, 120, 150);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.couponsUsed).toBe(0);
      expect(result.result.revenue).toBe(0);
    }
  });

  it("rejects last coupon below previous closing", () => {
    const result = calculateCasualSwimCouponRevenue(120, 110, 150);
    expect(result).toEqual({ ok: false, message: COUPON_CLOSING_VALIDATION_ERROR });
  });
});
