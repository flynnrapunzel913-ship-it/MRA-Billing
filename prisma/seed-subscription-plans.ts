import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_PLANS = [
  { id: "spl_month_1", planName: "1 Month Swimming", description: "Monthly Package Without Coaching", duration: "1 Month", durationValue: 1, durationUnit: "MONTHS" as const, fees: 3540 },
  { id: "spl_month_2", planName: "2 Months Swimming", description: "Monthly Package Without Coaching", duration: "2 Months", durationValue: 2, durationUnit: "MONTHS" as const, fees: 5900 },
  { id: "spl_month_3", planName: "3 Months Swimming", description: "Monthly Package Without Coaching", duration: "3 Months", durationValue: 3, durationUnit: "MONTHS" as const, fees: 8260 },
  { id: "spl_month_6", planName: "6 Months Swimming", description: "Monthly Package Without Coaching", duration: "6 Months", durationValue: 6, durationUnit: "MONTHS" as const, fees: 14160 },
  { id: "spl_month_12", planName: "1 Year Swimming", description: "Monthly Package Without Coaching", duration: "1 Year", durationValue: 1, durationUnit: "YEARS" as const, fees: 21240 },
  { id: "spl_coach_21", planName: "21 Classes Coaching", description: "Within 30 Days", duration: "30 Days", durationValue: 30, durationUnit: "DAYS" as const, fees: 5000 },
  { id: "spl_casual_adult", planName: "Casual Swim Adult", description: "Per Hour", duration: "1 Hour", durationValue: 1, durationUnit: "DAYS" as const, fees: 150 },
  { id: "spl_casual_child", planName: "Casual Swim Below 5 Years", description: "Per Hour", duration: "1 Hour", durationValue: 1, durationUnit: "DAYS" as const, fees: 100 },
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
        durationValue: row.durationValue,
        durationUnit: row.durationUnit,
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
