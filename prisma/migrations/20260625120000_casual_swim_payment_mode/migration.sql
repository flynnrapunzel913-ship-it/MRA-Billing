-- Casual swim ticket payment mode (cash / UPI) for daily collection integration.
CREATE TYPE "RevenuePaymentMode" AS ENUM ('CASH', 'UPI');

ALTER TABLE "CasualSwimBill"
ADD COLUMN "paymentMode" "RevenuePaymentMode" NOT NULL DEFAULT 'CASH';
