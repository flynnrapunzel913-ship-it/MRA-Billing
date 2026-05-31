-- AlterTable: Customer new fields
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "emergencyContact" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "parentName" TEXT;

-- AlterTable: Invoice soft delete
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Invoice_deletedAt_idx" ON "Invoice"("deletedAt");

-- CreateEnum
CREATE TYPE "CustomerActivityType" AS ENUM ('CUSTOMER_ADDED', 'INVOICE_CREATED', 'PAYMENT_MADE', 'PACKAGE_PURCHASED');

-- CreateTable
CREATE TABLE IF NOT EXISTS "CustomerActivity" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "CustomerActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CustomerActivity_customerId_idx" ON "CustomerActivity"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerActivity_createdAt_idx" ON "CustomerActivity"("createdAt");

ALTER TABLE "CustomerActivity" ADD CONSTRAINT "CustomerActivity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
