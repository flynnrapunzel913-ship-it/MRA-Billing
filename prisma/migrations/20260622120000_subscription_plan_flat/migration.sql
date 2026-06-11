-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "description" TEXT,
    "duration" TEXT NOT NULL,
    "fees" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- Migrate SubscriptionPricing -> SubscriptionPlan (preserve IDs)
INSERT INTO "SubscriptionPlan" ("id", "planName", "description", "duration", "fees", "isActive", "createdAt", "updatedAt")
SELECT
    sp."id",
    CASE sp."section"::text
        WHEN 'MONTHLY_PACKAGE' THEN sp."label" || ' Swimming'
        WHEN 'COACHING_PACKAGE' THEN
            CASE
                WHEN sp."label" ILIKE '%21 Classes%' THEN '21 Classes Coaching'
                ELSE sp."label" || ' Coaching'
            END
        WHEN 'CASUAL_SWIMMING' THEN
            CASE
                WHEN sp."label" ILIKE '%Adult%' THEN 'Casual Swim Adult'
                WHEN sp."label" ILIKE '%Below 5%' THEN 'Casual Swim Below 5 Years'
                ELSE 'Casual Swim ' || sp."label"
            END
        ELSE sp."label"
    END,
    CASE sp."section"::text
        WHEN 'MONTHLY_PACKAGE' THEN 'Monthly Package Without Coaching'
        WHEN 'COACHING_PACKAGE' THEN 'Within 30 Days'
        WHEN 'CASUAL_SWIMMING' THEN 'Per Hour'
        ELSE sp."description"
    END,
    CASE sp."section"::text
        WHEN 'MONTHLY_PACKAGE' THEN sp."label"
        WHEN 'COACHING_PACKAGE' THEN '30 Days'
        WHEN 'CASUAL_SWIMMING' THEN '1 Hour'
        ELSE sp."label"
    END,
    sp."price",
    sp."isActive",
    sp."createdAt",
    sp."updatedAt"
FROM "SubscriptionPricing" sp;

-- InvoiceItem snapshot columns
ALTER TABLE "InvoiceItem" ADD COLUMN "subscriptionPlanId" TEXT;
ALTER TABLE "InvoiceItem" ADD COLUMN "planNameSnapshot" TEXT;
ALTER TABLE "InvoiceItem" ADD COLUMN "descriptionSnapshot" TEXT;
ALTER TABLE "InvoiceItem" ADD COLUMN "durationSnapshot" TEXT;
ALTER TABLE "InvoiceItem" ADD COLUMN "feesSnapshot" DECIMAL(10,2);

UPDATE "InvoiceItem" ii
SET
    "subscriptionPlanId" = ii."subscriptionPricingId",
    "planNameSnapshot" = COALESCE(ii."labelSnapshot", 'Subscription Plan'),
    "descriptionSnapshot" = ii."sectionSnapshot",
    "durationSnapshot" = ii."labelSnapshot",
    "feesSnapshot" = ii."priceSnapshot"
WHERE ii."subscriptionPricingId" IS NOT NULL;

-- Drop legacy FKs and columns
ALTER TABLE "InvoiceItem" DROP CONSTRAINT IF EXISTS "InvoiceItem_subscriptionPricingId_fkey";
ALTER TABLE "InvoiceItem" DROP COLUMN "subscriptionPricingId";
ALTER TABLE "InvoiceItem" DROP COLUMN "sectionSnapshot";
ALTER TABLE "InvoiceItem" DROP COLUMN "labelSnapshot";
ALTER TABLE "InvoiceItem" DROP COLUMN "priceSnapshot";

DROP TABLE "SubscriptionPricing";
DROP TYPE "PricingSection";

-- Seed default plans when table is empty
INSERT INTO "SubscriptionPlan" ("id", "planName", "description", "duration", "fees", "isActive", "createdAt", "updatedAt")
SELECT v.id, v."planName", v.description, v.duration, v.fees, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    ('spl_month_1', '1 Month Swimming', 'Monthly Package Without Coaching', '1 Month', 3540),
    ('spl_month_2', '2 Months Swimming', 'Monthly Package Without Coaching', '2 Months', 5900),
    ('spl_month_3', '3 Months Swimming', 'Monthly Package Without Coaching', '3 Months', 8260),
    ('spl_month_6', '6 Months Swimming', 'Monthly Package Without Coaching', '6 Months', 14160),
    ('spl_month_12', '1 Year Swimming', 'Monthly Package Without Coaching', '1 Year', 21240),
    ('spl_coach_21', '21 Classes Coaching', 'Within 30 Days', '30 Days', 5000),
    ('spl_casual_adult', 'Casual Swim Adult', 'Per Hour', '1 Hour', 150),
    ('spl_casual_child', 'Casual Swim Below 5 Years', 'Per Hour', '1 Hour', 100)
) AS v(id, "planName", description, duration, fees)
WHERE NOT EXISTS (SELECT 1 FROM "SubscriptionPlan" LIMIT 1);

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "SubscriptionPlan_isActive_idx" ON "SubscriptionPlan"("isActive");
CREATE INDEX "SubscriptionPlan_planName_idx" ON "SubscriptionPlan"("planName");
