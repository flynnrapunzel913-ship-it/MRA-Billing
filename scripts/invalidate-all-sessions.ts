/**
 * Bump sessionVersion for every user — invalidates all existing JWT sessions.
 * Run after rotating AUTH_SECRET or if session cookies may have been exposed.
 *
 * Usage: npx tsx scripts/invalidate-all-sessions.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    data: { sessionVersion: { increment: 1 } },
  });
  console.log(`Invalidated sessions for ${result.count} user(s).`);
  console.log("Users must sign in again. Ensure AUTH_SECRET is rotated if cookies were exposed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
