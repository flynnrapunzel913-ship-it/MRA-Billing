-- Usage days (entitlement) separate from validity period (expiry window)
ALTER TABLE "SubscriptionPlan" ADD COLUMN "usageDays" INTEGER;

ALTER TABLE "InvoiceItem" ADD COLUMN "usageDaysSnapshot" INTEGER;

-- 21 classes: 21 usage days within 1 month validity
UPDATE "SubscriptionPlan"
SET
  "usageDays" = 21,
  "durationValue" = 1,
  "durationUnit" = 'MONTHS',
  "duration" = '21 days within 1 Month'
WHERE "id" = 'spl_coach_21';

-- Annual plan example: optional usage cap within 1 year
UPDATE "SubscriptionPlan"
SET
  "usageDays" = 320,
  "duration" = '320 days within 1 Year'
WHERE "id" = 'spl_month_12';
