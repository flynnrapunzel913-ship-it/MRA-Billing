-- Casual swimming payment reconciliation (cash/UPI split after admin confirms)

ALTER TABLE "DailyCollection" ADD COLUMN "casualSwimCashCollected" DECIMAL(12,2);
ALTER TABLE "DailyCollection" ADD COLUMN "casualSwimUpiCollected" DECIMAL(12,2);

CREATE TABLE "CasualSwimReconciliation" (
    "id" TEXT NOT NULL,
    "collectionDate" TIMESTAMP(3) NOT NULL,
    "cashAmount" DECIMAL(12,2) NOT NULL,
    "upiAmount" DECIMAL(12,2) NOT NULL,
    "casualSwimTotal" DECIMAL(12,2) NOT NULL,
    "reconciledAt" TIMESTAMP(3) NOT NULL,
    "reconciledByUserId" TEXT NOT NULL,
    "reconciledByName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CasualSwimReconciliation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CasualSwimReconciliation_collectionDate_key" ON "CasualSwimReconciliation"("collectionDate");
CREATE INDEX "CasualSwimReconciliation_collectionDate_idx" ON "CasualSwimReconciliation"("collectionDate");

ALTER TABLE "CasualSwimReconciliation" ADD CONSTRAINT "CasualSwimReconciliation_reconciledByUserId_fkey" FOREIGN KEY ("reconciledByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
