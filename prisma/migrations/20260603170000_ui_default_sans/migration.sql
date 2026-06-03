-- Default UI font: Modern Sans (Inter) at medium size
ALTER TABLE "User" ALTER COLUMN "uiFontFamily" SET DEFAULT 'sans';

-- Users still on the previous factory default (serif) move to the new site default
UPDATE "User" SET "uiFontFamily" = 'sans' WHERE "uiFontFamily" = 'serif';
