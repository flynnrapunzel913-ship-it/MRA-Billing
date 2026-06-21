-- Separate Above 5 / Below 5 casual swim coupon books.

ALTER TABLE "Settings" ADD COLUMN "casualSwimAdultCouponRate" DECIMAL(10,2) NOT NULL DEFAULT 150;
ALTER TABLE "Settings" ADD COLUMN "casualSwimChildCouponRate" DECIMAL(10,2) NOT NULL DEFAULT 100;

UPDATE "Settings"
SET "casualSwimAdultCouponRate" = COALESCE("casualSwimCouponRate", 150)
WHERE "casualSwimCouponRate" IS NOT NULL;

ALTER TABLE "Settings" DROP COLUMN IF EXISTS "casualSwimCouponRate";

ALTER TABLE "DailyCollection" ADD COLUMN "lastCouponAbove5" INTEGER;
ALTER TABLE "DailyCollection" ADD COLUMN "lastCouponBelow5" INTEGER;
ALTER TABLE "DailyCollection" ADD COLUMN "casualSwimCouponsAbove5" INTEGER;
ALTER TABLE "DailyCollection" ADD COLUMN "casualSwimCouponsBelow5" INTEGER;
ALTER TABLE "DailyCollection" ADD COLUMN "casualSwimRevenueAbove5" DECIMAL(12,2);
ALTER TABLE "DailyCollection" ADD COLUMN "casualSwimRevenueBelow5" DECIMAL(12,2);

UPDATE "DailyCollection"
SET
  "lastCouponAbove5" = "lastCouponNumber",
  "casualSwimCouponsAbove5" = "casualSwimCouponsUsed",
  "casualSwimRevenueAbove5" = CASE
    WHEN "casualSwimCouponsUsed" IS NOT NULL AND "casualSwimCouponRate" IS NOT NULL
      THEN "casualSwimCouponsUsed" * "casualSwimCouponRate"
    ELSE "casualSwimRevenue"
  END
WHERE "lastCouponNumber" IS NOT NULL OR "casualSwimCouponsUsed" IS NOT NULL;

ALTER TABLE "DailyCollection" DROP COLUMN IF EXISTS "lastCouponNumber";
ALTER TABLE "DailyCollection" DROP COLUMN IF EXISTS "casualSwimCouponsUsed";
ALTER TABLE "DailyCollection" DROP COLUMN IF EXISTS "casualSwimCouponRate";
