import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_PLANS = [
  { id: "spl_month_1", planName: "1 Month Swimming", description: "Monthly Package Without Coaching", duration: "1 Month", fees: 3540 },
  { id: "spl_month_2", planName: "2 Months Swimming", description: "Monthly Package Without Coaching", duration: "2 Months", fees: 5900 },
  { id: "spl_month_3", planName: "3 Months Swimming", description: "Monthly Package Without Coaching", duration: "3 Months", fees: 8260 },
  { id: "spl_month_6", planName: "6 Months Swimming", description: "Monthly Package Without Coaching", duration: "6 Months", fees: 14160 },
  { id: "spl_month_12", planName: "1 Year Swimming", description: "Monthly Package Without Coaching", duration: "1 Year", fees: 21240 },
  { id: "spl_coach_21", planName: "21 Classes Coaching", description: "Within 30 Days", duration: "30 Days", fees: 5000 },
  { id: "spl_casual_adult", planName: "Casual Swim Adult", description: "Per Hour", duration: "1 Hour", fees: 150 },
  { id: "spl_casual_child", planName: "Casual Swim Below 5 Years", description: "Per Hour", duration: "1 Hour", fees: 100 },
] as const;

async function main() {
  for (const row of DEFAULT_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { id: row.id },
      create: { ...row, isActive: true },
      update: {
        planName: row.planName,
        description: row.description,
        duration: row.duration,
        fees: row.fees,
        isActive: true,
      },
    });
  }
  console.log("Subscription plans seeded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
