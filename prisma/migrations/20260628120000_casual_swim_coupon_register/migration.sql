-- Manual coupon register: rate on Settings, coupon tracking on DailyCollection.

ALTER TABLE "Settings" ADD COLUMN "casualSwimCouponRate" DECIMAL(10,2) NOT NULL DEFAULT 150;

ALTER TABLE "DailyCollection" ADD COLUMN "lastCouponNumber" INTEGER;
ALTER TABLE "DailyCollection" ADD COLUMN "casualSwimCouponsUsed" INTEGER;
ALTER TABLE "DailyCollection" ADD COLUMN "casualSwimCouponRate" DECIMAL(10,2);
ALTER TABLE "DailyCollection" ADD COLUMN "casualSwimRevenue" DECIMAL(12,2);
ALTER TABLE "DailyCollection" ADD COLUMN "invoiceRevenue" DECIMAL(12,2);
