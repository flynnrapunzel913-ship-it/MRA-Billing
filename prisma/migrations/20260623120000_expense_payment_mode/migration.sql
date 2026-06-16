-- CreateEnum
CREATE TYPE "ExpensePaymentMode" AS ENUM ('CASH', 'UPI');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "paymentMode" "ExpensePaymentMode" NOT NULL DEFAULT 'CASH';
