-- CreateTable
CREATE TABLE "PackageGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageItem" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageItem_pkey" PRIMARY KEY ("id")
);

-- Migrate SubscriptionCategory -> PackageGroup (preserve IDs)
INSERT INTO "PackageGroup" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT "id", "name", "description", "isActive", "createdAt", "updatedAt"
FROM "SubscriptionCategory";

-- Migrate SubscriptionPlan -> PackageItem (preserve IDs)
INSERT INTO "PackageItem" ("id", "groupId", "title", "price", "description", "isActive", "createdAt", "updatedAt")
SELECT
    "id",
    "categoryId",
    "planName",
    "price",
    "description",
    "isActive",
    "createdAt",
    "updatedAt"
FROM "SubscriptionPlan";

-- InvoiceItem: new snapshot columns
ALTER TABLE "InvoiceItem" ADD COLUMN "packageGroupId" TEXT;
ALTER TABLE "InvoiceItem" ADD COLUMN "packageItemId" TEXT;
ALTER TABLE "InvoiceItem" ADD COLUMN "groupNameSnapshot" TEXT;
ALTER TABLE "InvoiceItem" ADD COLUMN "itemTitleSnapshot" TEXT;

UPDATE "InvoiceItem"
SET
    "packageGroupId" = "subscriptionCategoryId",
    "packageItemId" = "subscriptionPlanId",
    "groupNameSnapshot" = "categoryNameSnapshot",
    "itemTitleSnapshot" = "planNameSnapshot"
WHERE "subscriptionCategoryId" IS NOT NULL OR "subscriptionPlanId" IS NOT NULL;

-- Drop legacy FKs and columns
ALTER TABLE "InvoiceItem" DROP CONSTRAINT IF EXISTS "InvoiceItem_subscriptionCategoryId_fkey";
ALTER TABLE "InvoiceItem" DROP CONSTRAINT IF EXISTS "InvoiceItem_subscriptionPlanId_fkey";
ALTER TABLE "InvoiceItem" DROP COLUMN "subscriptionCategoryId";
ALTER TABLE "InvoiceItem" DROP COLUMN "subscriptionPlanId";
ALTER TABLE "InvoiceItem" DROP COLUMN "categoryNameSnapshot";
ALTER TABLE "InvoiceItem" DROP COLUMN "planNameSnapshot";

-- Drop legacy tables
DROP TABLE "SubscriptionPlan";
DROP TABLE "SubscriptionCategory";
DROP TYPE "DurationUnit";

-- AddForeignKey
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PackageGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_packageGroupId_fkey" FOREIGN KEY ("packageGroupId") REFERENCES "PackageGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_packageItemId_fkey" FOREIGN KEY ("packageItemId") REFERENCES "PackageItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "PackageGroup_isActive_idx" ON "PackageGroup"("isActive");
CREATE INDEX "PackageGroup_name_idx" ON "PackageGroup"("name");
CREATE INDEX "PackageItem_groupId_idx" ON "PackageItem"("groupId");
CREATE INDEX "PackageItem_isActive_idx" ON "PackageItem"("isActive");
CREATE INDEX "PackageItem_title_idx" ON "PackageItem"("title");
