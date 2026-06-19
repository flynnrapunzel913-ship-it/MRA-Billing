-- Remove casual swimming module: tables, settings columns, CASHIER role.

DROP TABLE IF EXISTS "CasualSwimBill";
DROP TABLE IF EXISTS "CasualSwimTicketSequence";

DROP TYPE IF EXISTS "CasualSwimBillStatus";
DROP TYPE IF EXISTS "RevenuePaymentMode";

ALTER TABLE "Settings" DROP COLUMN IF EXISTS "casualSwimAdultRatePerHour";
ALTER TABLE "Settings" DROP COLUMN IF EXISTS "casualSwimChildRatePerHour";
ALTER TABLE "Settings" DROP COLUMN IF EXISTS "casualSwimCapRentalPrice";
ALTER TABLE "Settings" DROP COLUMN IF EXISTS "casualSwimShortsRentalPrice";
ALTER TABLE "Settings" DROP COLUMN IF EXISTS "casualSwimGogglesRentalPrice";

UPDATE "User" SET role = 'RECEPTIONIST' WHERE role = 'CASHIER';

ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('ADMIN', 'RECEPTIONIST');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'RECEPTIONIST'::"Role";
DROP TYPE "Role_old";
