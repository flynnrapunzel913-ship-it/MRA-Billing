-- Add username column first (nullable for backfill)
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Backfill from email local-part when available
UPDATE "User"
SET "username" = LOWER(
  REGEXP_REPLACE(
    SPLIT_PART(COALESCE("email", ''), '@', 1),
    '[^a-zA-Z0-9_]+',
    '',
    'g'
  )
)
WHERE "username" IS NULL;

-- Fallback to sanitized name when email part is empty
UPDATE "User"
SET "username" = LOWER(
  REGEXP_REPLACE(
    COALESCE("name", 'user'),
    '[^a-zA-Z0-9_]+',
    '',
    'g'
  )
)
WHERE COALESCE("username", '') = '';

-- Final fallback to deterministic user_<id-prefix>
UPDATE "User"
SET "username" = CONCAT('user_', SUBSTRING("id" FROM 1 FOR 8))
WHERE COALESCE("username", '') = '';

-- Ensure unique usernames by suffixing duplicates
WITH dedup AS (
  SELECT
    "id",
    "username",
    ROW_NUMBER() OVER (PARTITION BY "username" ORDER BY "createdAt", "id") AS rn
  FROM "User"
)
UPDATE "User" u
SET "username" = CASE
  WHEN d.rn = 1 THEN d."username"
  ELSE CONCAT(d."username", d.rn::text)
END
FROM dedup d
WHERE u."id" = d."id";

-- Make username required and unique
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Email is no longer required for authentication
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

