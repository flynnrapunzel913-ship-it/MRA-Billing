-- Partial (cash + UPI) payments for casual swimming tickets.
ALTER TYPE "RevenuePaymentMode" ADD VALUE IF NOT EXISTS 'PARTIAL';

ALTER TABLE "CasualSwimBill"
ADD COLUMN "cashAmount" DECIMAL(12, 2),
ADD COLUMN "upiAmount" DECIMAL(12, 2);

UPDATE "CasualSwimBill"
SET "cashAmount" = "totalAmount",
    "upiAmount" = 0
WHERE "paymentMode" = 'CASH';

UPDATE "CasualSwimBill"
SET "cashAmount" = 0,
    "upiAmount" = "totalAmount"
WHERE "paymentMode" = 'UPI';

UPDATE "CasualSwimBill"
SET "cashAmount" = COALESCE("cashAmount", "totalAmount"),
    "upiAmount" = COALESCE("upiAmount", 0)
WHERE "cashAmount" IS NULL;

ALTER TABLE "CasualSwimBill"
ALTER COLUMN "cashAmount" SET NOT NULL,
ALTER COLUMN "upiAmount" SET NOT NULL;
