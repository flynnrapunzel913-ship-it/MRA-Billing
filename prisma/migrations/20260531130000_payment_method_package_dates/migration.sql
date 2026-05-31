-- CreateEnum
CREATE TYPE "InvoicePaymentMethod" AS ENUM ('CASH', 'CARD', 'UPI', 'OTHER');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paymentMethod" "InvoicePaymentMethod" NOT NULL DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "packageStartDate" TIMESTAMP(3);
ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "packageEndDate" TIMESTAMP(3);
