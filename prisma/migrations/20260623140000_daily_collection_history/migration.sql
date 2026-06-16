-- AlterTable
ALTER TABLE "DailyCollection" ADD COLUMN "originalSnapshotJson" JSONB;

-- CreateTable
CREATE TABLE "DailyCollectionHistory" (
    "id" TEXT NOT NULL,
    "dailyCollectionId" TEXT NOT NULL,
    "editedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changesJson" JSONB NOT NULL,

    CONSTRAINT "DailyCollectionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyCollectionHistory_dailyCollectionId_idx" ON "DailyCollectionHistory"("dailyCollectionId");

-- CreateIndex
CREATE INDEX "DailyCollectionHistory_createdAt_idx" ON "DailyCollectionHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "DailyCollectionHistory" ADD CONSTRAINT "DailyCollectionHistory_dailyCollectionId_fkey" FOREIGN KEY ("dailyCollectionId") REFERENCES "DailyCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCollectionHistory" ADD CONSTRAINT "DailyCollectionHistory_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
