-- CreateEnum
CREATE TYPE "PricingSection" AS ENUM ('MONTHLY_PACKAGE', 'COACHING_PACKAGE', 'CASUAL_SWIMMING');

-- CreateTable
CREATE TABLE "SubscriptionPricing" (
    "id" TEXT NOT NULL,
    "section" "PricingSection" NOT NULL,
    "label" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPricing_pkey" PRIMARY KEY ("id")
);

-- Migrate PackageItem rows into SubscriptionPricing (preserve IDs)
INSERT INTO "SubscriptionPricing" ("id", "section", "label", "price", "description", "isActive", "createdAt", "updatedAt")
SELECT
    pi."id",
    CASE
        WHEN pg."name" ILIKE '%casual%' THEN 'CASUAL_SWIMMING'::"PricingSection"
        WHEN pg."name" ILIKE '%coaching%' THEN 'COACHING_PACKAGE'::"PricingSection"
        ELSE 'MONTHLY_PACKAGE'::"PricingSection"
    END,
    pi."title",
    pi."price",
    pi."description",
    pi."isActive",
    pi."createdAt",
    pi."updatedAt"
FROM "PackageItem" pi
JOIN "PackageGroup" pg ON pi."groupId" = pg."id";

-- InvoiceItem snapshot columns
ALTER TABLE "InvoiceItem" ADD COLUMN "subscriptionPricingId" TEXT;
ALTER TABLE "InvoiceItem" ADD COLUMN "sectionSnapshot" TEXT;
ALTER TABLE "InvoiceItem" ADD COLUMN "labelSnapshot" TEXT;

UPDATE "InvoiceItem" ii
SET
    "subscriptionPricingId" = ii."packageItemId",
    "labelSnapshot" = ii."itemTitleSnapshot",
    "sectionSnapshot" = CASE
        WHEN ii."groupNameSnapshot" ILIKE '%casual%' THEN 'CASUAL_SWIMMING'
        WHEN ii."groupNameSnapshot" ILIKE '%coaching%' THEN 'COACHING_PACKAGE'
        WHEN ii."groupNameSnapshot" IS NOT NULL THEN 'MONTHLY_PACKAGE'
        ELSE NULL
    END
WHERE ii."packageItemId" IS NOT NULL OR ii."itemTitleSnapshot" IS NOT NULL;

-- Drop legacy FKs and columns
ALTER TABLE "InvoiceItem" DROP CONSTRAINT IF EXISTS "InvoiceItem_packageGroupId_fkey";
ALTER TABLE "InvoiceItem" DROP CONSTRAINT IF EXISTS "InvoiceItem_packageItemId_fkey";
ALTER TABLE "InvoiceItem" DROP COLUMN "packageGroupId";
ALTER TABLE "InvoiceItem" DROP COLUMN "packageItemId";
ALTER TABLE "InvoiceItem" DROP COLUMN "groupNameSnapshot";
ALTER TABLE "InvoiceItem" DROP COLUMN "itemTitleSnapshot";

-- Drop legacy tables
DROP TABLE "PackageItem";
DROP TABLE "PackageGroup";

-- Seed default MR Academy price list when empty
INSERT INTO "SubscriptionPricing" ("id", "section", "label", "price", "isActive", "createdAt", "updatedAt")
SELECT v.id, v.section::"PricingSection", v.label, v.price, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    ('sp_month_1', 'MONTHLY_PACKAGE', '1 Month', 3540),
    ('sp_month_2', 'MONTHLY_PACKAGE', '2 Months', 5900),
    ('sp_month_3', 'MONTHLY_PACKAGE', '3 Months', 8260),
    ('sp_month_6', 'MONTHLY_PACKAGE', '6 Months', 14160),
    ('sp_month_12', 'MONTHLY_PACKAGE', '1 Year', 21240),
    ('sp_coach_21', 'COACHING_PACKAGE', '21 Classes Within 30 Days', 5000),
    ('sp_casual_adult', 'CASUAL_SWIMMING', 'Adult Per Hour', 150),
    ('sp_casual_child', 'CASUAL_SWIMMING', 'Below 5 Years', 100)
) AS v(id, section, label, price)
WHERE NOT EXISTS (SELECT 1 FROM "SubscriptionPricing" LIMIT 1);

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_subscriptionPricingId_fkey" FOREIGN KEY ("subscriptionPricingId") REFERENCES "SubscriptionPricing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "SubscriptionPricing_section_idx" ON "SubscriptionPricing"("section");
CREATE INDEX "SubscriptionPricing_isActive_idx" ON "SubscriptionPricing"("isActive");
CREATE INDEX "SubscriptionPricing_label_idx" ON "SubscriptionPricing"("label");
