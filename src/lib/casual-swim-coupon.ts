export const DEFAULT_ADULT_COUPON_RATE = 150;
export const DEFAULT_CHILD_COUPON_RATE = 100;

export const COUPON_CLOSING_VALIDATION_ERROR =
  "Today's Last Coupon cannot be less than the previous closing coupon.";

export function couponClosingValidationError(bookLabel: string): string {
  return `Today's Last Coupon (${bookLabel}) cannot be less than the previous closing coupon.`;
}

export type CasualSwimCouponBookCalc = {
  previousClosingCoupon: number;
  lastCouponNumber: number;
  couponRate: number;
  couponsUsed: number;
  revenue: number;
};

export type CasualSwimCouponBook = {
  previousClosingCoupon: number;
  lastCouponNumber: number | null;
  couponRate: number;
  couponsUsed: number;
  revenue: number;
};

export type CasualSwimDualCouponTracking = {
  above5: CasualSwimCouponBook;
  below5: CasualSwimCouponBook;
  couponsUsed: number;
  revenue: number;
};

export function calculateCasualSwimCouponRevenue(
  previousClosingCoupon: number,
  lastCouponNumber: number,
  couponRate: number,
  bookLabel?: string
): { ok: true; result: CasualSwimCouponBookCalc } | { ok: false; message: string } {
  if (lastCouponNumber < previousClosingCoupon) {
    return {
      ok: false,
      message: bookLabel
        ? couponClosingValidationError(bookLabel)
        : COUPON_CLOSING_VALIDATION_ERROR,
    };
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

export function resolveCasualSwimCouponBook(
  previousClosingCoupon: number,
  couponRate: number,
  lastCouponNumber: number | null
): CasualSwimCouponBook {
  if (lastCouponNumber == null) {
    return {
      previousClosingCoupon,
      lastCouponNumber: null,
      couponRate,
      couponsUsed: 0,
      revenue: 0,
    };
  }

  const calc = calculateCasualSwimCouponRevenue(
    previousClosingCoupon,
    lastCouponNumber,
    couponRate
  );
  if (!calc.ok) {
    return {
      previousClosingCoupon,
      lastCouponNumber,
      couponRate,
      couponsUsed: 0,
      revenue: 0,
    };
  }

  return {
    previousClosingCoupon,
    lastCouponNumber: calc.result.lastCouponNumber,
    couponRate: calc.result.couponRate,
    couponsUsed: calc.result.couponsUsed,
    revenue: calc.result.revenue,
  };
}

export function calculateCasualSwimDualCouponRevenue(input: {
  previousAbove5: number;
  previousBelow5: number;
  lastCouponAbove5: number;
  lastCouponBelow5: number;
  adultCouponRate: number;
  childCouponRate: number;
}): { ok: true; result: CasualSwimDualCouponTracking } | { ok: false; message: string } {
  const aboveCalc = calculateCasualSwimCouponRevenue(
    input.previousAbove5,
    input.lastCouponAbove5,
    input.adultCouponRate,
    "Above 5 Years"
  );
  if (!aboveCalc.ok) return aboveCalc;

  const belowCalc = calculateCasualSwimCouponRevenue(
    input.previousBelow5,
    input.lastCouponBelow5,
    input.childCouponRate,
    "Below 5 Years"
  );
  if (!belowCalc.ok) return belowCalc;

  return {
    ok: true,
    result: {
      above5: {
        ...aboveCalc.result,
        lastCouponNumber: aboveCalc.result.lastCouponNumber,
      },
      below5: {
        ...belowCalc.result,
        lastCouponNumber: belowCalc.result.lastCouponNumber,
      },
      couponsUsed: aboveCalc.result.couponsUsed + belowCalc.result.couponsUsed,
      revenue: aboveCalc.result.revenue + belowCalc.result.revenue,
    },
  };
}
