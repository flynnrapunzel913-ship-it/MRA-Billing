-- Stock soft delete (S2-06)
ALTER TABLE "StockEntry" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "StockEntry_deletedAt_idx" ON "StockEntry"("deletedAt");
