-- Replace unitPrice + totalAmount with single totalCost on StockEntry
ALTER TABLE "StockEntry" ADD COLUMN "totalCost" DECIMAL(12,2);

UPDATE "StockEntry" SET "totalCost" = "totalAmount" WHERE "totalAmount" IS NOT NULL;

ALTER TABLE "StockEntry" ALTER COLUMN "totalCost" SET NOT NULL;

ALTER TABLE "StockEntry" DROP COLUMN "unitPrice";
ALTER TABLE "StockEntry" DROP COLUMN "totalAmount";
