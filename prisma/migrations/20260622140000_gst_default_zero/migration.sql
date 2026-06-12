-- Default CGST/SGST rates to 0% for new invoices
ALTER TABLE "Settings" ALTER COLUMN "defaultCgstRate" SET DEFAULT 0;
ALTER TABLE "Settings" ALTER COLUMN "defaultSgstRate" SET DEFAULT 0;

UPDATE "Settings"
SET "defaultCgstRate" = 0, "defaultSgstRate" = 0
WHERE "defaultCgstRate" = 9 AND "defaultSgstRate" = 9;
