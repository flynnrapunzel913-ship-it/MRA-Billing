-- AlterTable
ALTER TABLE "DailyCollection" ADD COLUMN "totalRevenue" DECIMAL(12,2),
ADD COLUMN "subscriptionRevenue" DECIMAL(12,2),
ADD COLUMN "productRevenue" DECIMAL(12,2),
ADD COLUMN "totalExpenses" DECIMAL(12,2),
ADD COLUMN "upiCollected" DECIMAL(12,2),
ADD COLUMN "netCollection" DECIMAL(12,2);
