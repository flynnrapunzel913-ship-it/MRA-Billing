-- CreateEnum
CREATE TYPE "DurationUnit" AS ENUM ('DAY', 'MONTH', 'YEAR', 'CLASS', 'HOUR', 'CUSTOM');

-- CreateTable
CREATE TABLE "SubscriptionCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "durationValue" INTEGER,
    "durationUnit" "DurationUnit",
    "sessionCount" INTEGER,
    "validityDays" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- Migrate legacy Subscription rows into category + plan
INSERT INTO "SubscriptionCategory" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT
    'sc_' || substr(md5("name"), 1, 24),
    "name",
    MAX("description"),
    BOOL_OR("status" = 'ACTIVE'),
    MIN("createdAt"),
    MAX("updatedAt")
FROM "Subscription"
GROUP BY "name";

INSERT INTO "SubscriptionPlan" (
    "id",
    "categoryId",
    "planName",
    "price",
    "durationUnit",
    "description",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    'sp_' || substr(md5("id"), 1, 24),
    'sc_' || substr(md5("name"), 1, 24),
    "duration",
    "price",
    'CUSTOM'::"DurationUnit",
    "duration",
    "status" = 'ACTIVE',
    "createdAt",
    "updatedAt"
FROM "Subscription";

-- Seed default catalog when no legacy subscriptions existed
INSERT INTO "SubscriptionCategory" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT v.id, v.name, v.description, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    ('sc_monthly_pkg', 'Monthly Package (Without Coaching)', 'Pool membership without coaching'),
    ('sc_basic_coaching', 'Basic Coaching Package', 'Coaching sessions package'),
    ('sc_casual_swim', 'Casual Swimming', 'Pay per hour casual swimming')
) AS v(id, name, description)
WHERE NOT EXISTS (SELECT 1 FROM "SubscriptionCategory" LIMIT 1);

INSERT INTO "SubscriptionPlan" (
    "id", "categoryId", "planName", "price", "durationValue", "durationUnit", "isActive", "createdAt", "updatedAt"
)
SELECT v.id, v."categoryId", v."planName", v.price, v."durationValue", v."durationUnit"::"DurationUnit", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    ('sp_m1', 'sc_monthly_pkg', '1 Month', 3540, 1, 'MONTH'),
    ('sp_m2', 'sc_monthly_pkg', '2 Months', 5900, 2, 'MONTH'),
    ('sp_m3', 'sc_monthly_pkg', '3 Months', 8260, 3, 'MONTH'),
    ('sp_m6', 'sc_monthly_pkg', '6 Months', 14160, 6, 'MONTH'),
    ('sp_y1', 'sc_monthly_pkg', '1 Year', 21240, 1, 'YEAR'),
    ('sp_coach21', 'sc_basic_coaching', '21 Classes / 30 Days', 5000, 21, 'CLASS'),
    ('sp_adult_hr', 'sc_casual_swim', 'Adult Per Hour', 150, 1, 'HOUR'),
    ('sp_child_hr', 'sc_casual_swim', 'Below 5 Years Per Hour', 100, 1, 'HOUR')
) AS v(id, "categoryId", "planName", price, "durationValue", "durationUnit")
WHERE NOT EXISTS (SELECT 1 FROM "SubscriptionPlan" LIMIT 1);

UPDATE "SubscriptionPlan"
SET "sessionCount" = 21, "validityDays" = 30
WHERE "id" = 'sp_coach21';

-- AlterTable InvoiceItem
ALTER TABLE "InvoiceItem" ADD COLUMN "subscriptionCategoryId" TEXT,
ADD COLUMN "subscriptionPlanId" TEXT,
ADD COLUMN "categoryNameSnapshot" TEXT,
ADD COLUMN "planNameSnapshot" TEXT,
ADD COLUMN "priceSnapshot" DECIMAL(10,2);

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SubscriptionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_subscriptionCategoryId_fkey" FOREIGN KEY ("subscriptionCategoryId") REFERENCES "SubscriptionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "SubscriptionCategory_isActive_idx" ON "SubscriptionCategory"("isActive");
CREATE INDEX "SubscriptionCategory_name_idx" ON "SubscriptionCategory"("name");
CREATE INDEX "SubscriptionPlan_categoryId_idx" ON "SubscriptionPlan"("categoryId");
CREATE INDEX "SubscriptionPlan_isActive_idx" ON "SubscriptionPlan"("isActive");
CREATE INDEX "SubscriptionPlan_planName_idx" ON "SubscriptionPlan"("planName");

-- DropTable
DROP TABLE "Subscription";
