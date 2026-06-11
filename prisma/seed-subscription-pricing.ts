import { PrismaClient, PricingSection } from "@prisma/client";

const prisma = new PrismaClient();

const MONTHLY_PACKAGES = [
  { id: "sp_month_1", label: "1 Month", price: 3540 },
  { id: "sp_month_2", label: "2 Months", price: 5900 },
  { id: "sp_month_3", label: "3 Months", price: 8260 },
  { id: "sp_month_6", label: "6 Months", price: 14160 },
  { id: "sp_month_12", label: "1 Year", price: 21240 },
] as const;

const COACHING_PACKAGES = [
  { id: "sp_coach_21", label: "21 Classes Within 30 Days", price: 5000 },
] as const;

const CASUAL_RATES = [
  { id: "sp_casual_adult", label: "Adult Per Hour", price: 150 },
  { id: "sp_casual_child", label: "Below 5 Years", price: 100 },
] as const;

async function upsertPricing(
  section: PricingSection,
  rows: ReadonlyArray<{ id: string; label: string; price: number }>
) {
  const canonicalIds = rows.map((row) => row.id);

  for (const row of rows) {
    await prisma.subscriptionPricing.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        section,
        label: row.label,
        price: row.price,
        isActive: true,
      },
      update: {
        section,
        label: row.label,
        price: row.price,
        isActive: true,
      },
    });
  }

  const extras = await prisma.subscriptionPricing.findMany({
    where: {
      section,
      id: { notIn: canonicalIds },
    },
  });

  for (const extra of extras) {
    const invoiceRefs = await prisma.invoiceItem.count({
      where: { subscriptionPricingId: extra.id },
    });
    if (invoiceRefs > 0) {
      await prisma.subscriptionPricing.update({
        where: { id: extra.id },
        data: { isActive: false },
      });
    } else {
      await prisma.subscriptionPricing.delete({ where: { id: extra.id } });
    }
  }
}

async function main() {
  await upsertPricing("MONTHLY_PACKAGE", MONTHLY_PACKAGES);
  await upsertPricing("COACHING_PACKAGE", COACHING_PACKAGES);
  await upsertPricing("CASUAL_SWIMMING", CASUAL_RATES);
  console.log("MR Academy price list seeded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
