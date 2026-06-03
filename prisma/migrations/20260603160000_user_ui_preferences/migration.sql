-- Per-user UI typography preferences (profile)
ALTER TABLE "User" ADD COLUMN "uiFontFamily" TEXT NOT NULL DEFAULT 'serif';
ALTER TABLE "User" ADD COLUMN "uiFontSize" TEXT NOT NULL DEFAULT 'medium';
