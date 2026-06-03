-- CreateEnum
CREATE TYPE "StockActivityType" AS ENUM ('STOCK_CREATED', 'STOCK_VIEWED', 'BILL_VIEWED', 'BILL_DOWNLOADED');

-- CreateTable
CREATE TABLE "StockSequence" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StockSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockEntry" (
    "id" TEXT NOT NULL,
    "stockNumber" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantityPurchased" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "supplierName" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "billPdfUrl" TEXT,
    "billFileName" TEXT,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockActivity" (
    "id" TEXT NOT NULL,
    "stockEntryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "StockActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockSequence_year_key" ON "StockSequence"("year");

-- CreateIndex
CREATE UNIQUE INDEX "StockEntry_stockNumber_key" ON "StockEntry"("stockNumber");

-- CreateIndex
CREATE INDEX "StockEntry_purchaseDate_idx" ON "StockEntry"("purchaseDate");

-- CreateIndex
CREATE INDEX "StockEntry_category_idx" ON "StockEntry"("category");

-- CreateIndex
CREATE INDEX "StockEntry_supplierName_idx" ON "StockEntry"("supplierName");

-- CreateIndex
CREATE INDEX "StockEntry_createdById_idx" ON "StockEntry"("createdById");

-- CreateIndex
CREATE INDEX "StockEntry_itemName_idx" ON "StockEntry"("itemName");

-- CreateIndex
CREATE INDEX "StockActivity_stockEntryId_idx" ON "StockActivity"("stockEntryId");

-- CreateIndex
CREATE INDEX "StockActivity_userId_idx" ON "StockActivity"("userId");

-- CreateIndex
CREATE INDEX "StockActivity_createdAt_idx" ON "StockActivity"("createdAt");

-- AddForeignKey
ALTER TABLE "StockEntry" ADD CONSTRAINT "StockEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockActivity" ADD CONSTRAINT "StockActivity_stockEntryId_fkey" FOREIGN KEY ("stockEntryId") REFERENCES "StockEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockActivity" ADD CONSTRAINT "StockActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
