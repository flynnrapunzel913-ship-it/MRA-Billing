import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orphans = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      invoices: { none: {} },
    },
    select: {
      id: true,
      name: true,
      mobile: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const total = await prisma.customer.count({
    where: {
      deletedAt: null,
      invoices: { none: {} },
    },
  });

  console.log(JSON.stringify({ totalOrphans: total, sample: orphans }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
