export const COUPON_CLOSING_VALIDATION_ERROR =
  "Today's Last Coupon cannot be less than the previous closing coupon.";

export type CasualSwimCouponCalc = {
  previousClosingCoupon: number;
  lastCouponNumber: number;
  couponRate: number;
  couponsUsed: number;
  revenue: number;
};

export function calculateCasualSwimCouponRevenue(
  previousClosingCoupon: number,
  lastCouponNumber: number,
  couponRate: number
): { ok: true; result: CasualSwimCouponCalc } | { ok: false; message: string } {
  if (lastCouponNumber < previousClosingCoupon) {
    return { ok: false, message: COUPON_CLOSING_VALIDATION_ERROR };
  }

  const couponsUsed = lastCouponNumber - previousClosingCoupon;
  const revenue = couponsUsed * couponRate;

  return {
    ok: true,
    result: {
      previousClosingCoupon,
      lastCouponNumber,
      couponRate,
      couponsUsed,
      revenue,
    },
  };
}
