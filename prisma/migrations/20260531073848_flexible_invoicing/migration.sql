/*
  Warnings:

  - You are about to drop the column `status` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `InvoiceItem` table. All the data in the column will be lost.
  - You are about to drop the column `packageId` on the `InvoiceItem` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `InvoiceItem` table. All the data in the column will be lost.
  - You are about to drop the column `rate` on the `InvoiceItem` table. All the data in the column will be lost.
  - You are about to drop the `CustomerPackage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Package` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `amountPaid` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountRemaining` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemType` to the `InvoiceItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitPrice` to the `InvoiceItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InvoicePaymentStatus" AS ENUM ('FULLY_PAID', 'PARTIALLY_PAID');

-- DropForeignKey
ALTER TABLE "CustomerPackage" DROP CONSTRAINT "CustomerPackage_customerId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerPackage" DROP CONSTRAINT "CustomerPackage_packageId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_customerId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceItem" DROP CONSTRAINT "InvoiceItem_packageId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceItem" DROP CONSTRAINT "InvoiceItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_invoiceId_fkey";

-- DropIndex
DROP INDEX "Invoice_status_idx";

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "mobile" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "status",
ADD COLUMN     "amountPaid" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "amountRemaining" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "paymentStatus" "InvoicePaymentStatus" NOT NULL DEFAULT 'FULLY_PAID',
ALTER COLUMN "customerId" DROP NOT NULL,
ALTER COLUMN "customerMobile" DROP NOT NULL;

-- AlterTable
ALTER TABLE "InvoiceItem" DROP COLUMN "category",
DROP COLUMN "packageId",
DROP COLUMN "productId",
DROP COLUMN "rate",
ADD COLUMN     "itemType" TEXT NOT NULL,
ADD COLUMN     "unitPrice" DECIMAL(10,2) NOT NULL;

-- DropTable
DROP TABLE "CustomerPackage";

-- DropTable
DROP TABLE "Package";

-- DropTable
DROP TABLE "Payment";

-- DropTable
DROP TABLE "Product";

-- DropEnum
DROP TYPE "InvoiceStatus";

-- DropEnum
DROP TYPE "PackageCategory";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "ProductCategory";

-- CreateIndex
CREATE INDEX "Invoice_paymentStatus_idx" ON "Invoice"("paymentStatus");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
