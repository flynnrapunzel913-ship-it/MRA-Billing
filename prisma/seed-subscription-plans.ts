import { PrismaClient } from "@prisma/client";
import { formatPlanCoverageSummary } from "../src/lib/subscription-duration";

const prisma = new PrismaClient();

const DEFAULT_PLANS = [
  {
    id: "spl_month_1",
    planName: "1 Month Swimming",
    description: "Monthly Package Without Coaching",
    usageDays: null,
    durationValue: 1,
    durationUnit: "MONTHS" as const,
    fees: 3540,
  },
  {
    id: "spl_month_2",
    planName: "2 Months Swimming",
    description: "Monthly Package Without Coaching",
    usageDays: null,
    durationValue: 2,
    durationUnit: "MONTHS" as const,
    fees: 5900,
  },
  {
    id: "spl_month_3",
    planName: "3 Months Swimming",
    description: "Monthly Package Without Coaching",
    usageDays: null,
    durationValue: 3,
    durationUnit: "MONTHS" as const,
    fees: 8260,
  },
  {
    id: "spl_month_6",
    planName: "6 Months Swimming",
    description: "Monthly Package Without Coaching",
    usageDays: null,
    durationValue: 6,
    durationUnit: "MONTHS" as const,
    fees: 14160,
  },
  {
    id: "spl_month_12",
    planName: "1 Year Swimming",
    description: "Monthly Package Without Coaching",
    usageDays: 320,
    durationValue: 1,
    durationUnit: "YEARS" as const,
    fees: 21240,
  },
  {
    id: "spl_coach_21",
    planName: "21 Classes Coaching",
    description: "21 class days within 1 month",
    usageDays: 21,
    durationValue: 1,
    durationUnit: "MONTHS" as const,
    fees: 5000,
  },
] as const;

async function main() {
  for (const row of DEFAULT_PLANS) {
    const duration = formatPlanCoverageSummary(row);
    await prisma.subscriptionPlan.upsert({
      where: { id: row.id },
      create: { ...row, duration, isActive: true },
      update: {
        planName: row.planName,
        description: row.description,
        usageDays: row.usageDays,
        duration,
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
