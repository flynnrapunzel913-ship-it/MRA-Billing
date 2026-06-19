/**
 * Post-cleanup production adjustments (one-time).
 * - Fix admin username
 * - Deduplicate subscription plans
 */
import "dotenv/config";
import { PrismaClient, Role, UserStatus } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_USERNAME = "rajesh.shetti";
const ADMIN_NAME = "Rajesh Shetti";

/** planName -> id to keep (prefer seed ids with correct duration metadata) */
const PLANS_TO_KEEP: Record<string, string> = {
  "1 Month Swimming": "spl_month_1",
  "2 Months Swimming": "spl_month_2",
  "3 Months Swimming": "spl_month_3",
  "6 Months Swimming": "sp_month_6",
  "1 Year Swimming": "sp_month_12",
  "21 Classes Coaching": "sp_coach_21",
};

const EXPECTED_FEES: Record<string, number> = {
  "1 Month Swimming": 3540,
  "2 Months Swimming": 5900,
  "3 Months Swimming": 8260,
  "6 Months Swimming": 14160,
  "1 Year Swimming": 21240,
  "21 Classes Coaching": 5000,
};

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No admin user found");

  await prisma.user.update({
    where: { id: admin.id },
    data: {
      username: ADMIN_USERNAME,
      name: ADMIN_NAME,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const allPlans = await prisma.subscriptionPlan.findMany();
  const keepIds = new Set(Object.values(PLANS_TO_KEEP));

  for (const [planName, keepId] of Object.entries(PLANS_TO_KEEP)) {
    const kept = allPlans.find((p) => p.id === keepId);
    if (!kept) throw new Error(`Missing plan to keep: ${planName} (${keepId})`);
    if (Number(kept.fees) !== EXPECTED_FEES[planName]) {
      throw new Error(
        `Fee mismatch for ${planName}: expected ${EXPECTED_FEES[planName]}, got ${kept.fees}`
      );
    }
  }

  const deleteIds = allPlans.filter((p) => !keepIds.has(p.id)).map((p) => p.id);

  if (deleteIds.length > 0) {
    const deleted = await prisma.subscriptionPlan.deleteMany({
      where: { id: { in: deleteIds } },
    });
    console.log(`Deleted ${deleted.count} duplicate subscription plan(s): ${deleteIds.join(", ")}`);
  } else {
    console.log("No duplicate subscription plans to delete.");
  }

  console.log(`Updated admin username to ${ADMIN_USERNAME}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
