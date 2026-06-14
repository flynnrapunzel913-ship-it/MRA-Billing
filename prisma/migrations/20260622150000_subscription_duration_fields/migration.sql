-- Structured subscription duration for invoice end-date calculation
CREATE TYPE "SubscriptionDurationUnit" AS ENUM ('DAYS', 'WEEKS', 'MONTHS', 'YEARS');

ALTER TABLE "SubscriptionPlan"
  ADD COLUMN "durationValue" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "durationUnit" "SubscriptionDurationUnit" NOT NULL DEFAULT 'MONTHS';

ALTER TABLE "InvoiceItem"
  ADD COLUMN "durationValueSnapshot" INTEGER,
  ADD COLUMN "durationUnitSnapshot" "SubscriptionDurationUnit";

-- Backfill from existing duration labels
UPDATE "SubscriptionPlan"
SET
  "durationValue" = COALESCE((regexp_match("duration", '^(\d+)'))[1]::INTEGER, 1),
  "durationUnit" = CASE
    WHEN "duration" ILIKE '%hour%' OR "duration" ILIKE '%day%' THEN 'DAYS'::"SubscriptionDurationUnit"
    WHEN "duration" ILIKE '%week%' THEN 'WEEKS'::"SubscriptionDurationUnit"
    WHEN "duration" ILIKE '%year%' THEN 'YEARS'::"SubscriptionDurationUnit"
    ELSE 'MONTHS'::"SubscriptionDurationUnit"
  END;
