-- AlterTable
ALTER TABLE "DailyCollection" ADD COLUMN "cashCollectedSystem" DECIMAL(12,2),
ADD COLUMN "cashCountedPhysical" DECIMAL(12,2),
ADD COLUMN "cashDifference" DECIMAL(12,2),
ADD COLUMN "cashDifferenceNotes" TEXT,
ADD COLUMN "cashDenominations" JSONB;
