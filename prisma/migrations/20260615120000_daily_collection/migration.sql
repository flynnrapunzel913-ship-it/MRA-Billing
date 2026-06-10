-- CreateTable
CREATE TABLE "DailyCollection" (
    "id" TEXT NOT NULL,
    "collectionDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "collectedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyCollection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyCollection_collectionDate_key" ON "DailyCollection"("collectionDate");

-- CreateIndex
CREATE INDEX "DailyCollection_collectionDate_idx" ON "DailyCollection"("collectionDate");

-- AddForeignKey
ALTER TABLE "DailyCollection" ADD CONSTRAINT "DailyCollection_collectedByUserId_fkey" FOREIGN KEY ("collectedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
