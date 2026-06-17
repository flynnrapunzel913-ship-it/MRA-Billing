-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'CASHIER';

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "casualSwimAdultRatePerHour" DECIMAL(10,2) NOT NULL DEFAULT 150,
ADD COLUMN "casualSwimChildRatePerHour" DECIMAL(10,2) NOT NULL DEFAULT 100,
ADD COLUMN "casualSwimCapRentalPrice" DECIMAL(10,2) NOT NULL DEFAULT 150,
ADD COLUMN "casualSwimShortsRentalPrice" DECIMAL(10,2) NOT NULL DEFAULT 200,
ADD COLUMN "casualSwimGogglesRentalPrice" DECIMAL(10,2) NOT NULL DEFAULT 150;

-- CreateEnum
CREATE TYPE "CasualSwimBillStatus" AS ENUM ('COMPLETED');

-- CreateTable
CREATE TABLE "CasualSwimTicketSequence" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CasualSwimTicketSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasualSwimBill" (
    "id" TEXT NOT NULL,
    "ticketNumber" INTEGER NOT NULL,
    "hours" INTEGER NOT NULL,
    "adultCount" INTEGER NOT NULL DEFAULT 0,
    "childCount" INTEGER NOT NULL DEFAULT 0,
    "capQty" INTEGER NOT NULL DEFAULT 0,
    "shortsQty" INTEGER NOT NULL DEFAULT 0,
    "gogglesQty" INTEGER NOT NULL DEFAULT 0,
    "adultRate" DECIMAL(10,2) NOT NULL,
    "childRate" DECIMAL(10,2) NOT NULL,
    "capRate" DECIMAL(10,2) NOT NULL,
    "shortsRate" DECIMAL(10,2) NOT NULL,
    "gogglesRate" DECIMAL(10,2) NOT NULL,
    "swimmingAmount" DECIMAL(12,2) NOT NULL,
    "rentalAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "status" "CasualSwimBillStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CasualSwimBill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CasualSwimBill_ticketNumber_key" ON "CasualSwimBill"("ticketNumber");

-- CreateIndex
CREATE INDEX "CasualSwimBill_createdAt_idx" ON "CasualSwimBill"("createdAt");

-- CreateIndex
CREATE INDEX "CasualSwimBill_createdById_idx" ON "CasualSwimBill"("createdById");

-- AddForeignKey
ALTER TABLE "CasualSwimBill" ADD CONSTRAINT "CasualSwimBill_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed ticket sequence row
INSERT INTO "CasualSwimTicketSequence" ("id", "lastNumber") VALUES ('default', 0) ON CONFLICT ("id") DO NOTHING;
