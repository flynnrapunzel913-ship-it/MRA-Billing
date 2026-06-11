import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const receptionPassword = await bcrypt.hash("reception123", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      name: "admin",
      email: null,
    },
    create: {
      username: "admin",
      email: null,
      password: adminPassword,
      name: "admin",
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { username: "receptionist1" },
    update: {
      name: "receptionist1",
      email: null,
    },
    create: {
      username: "receptionist1",
      email: null,
      password: receptionPassword,
      name: "receptionist1",
      role: Role.RECEPTIONIST,
    },
  });

  await prisma.settings.upsert({
    where: { id: "default" },
    update: {
      logoUrl: "/branding/logo.png",
      headerImageUrl: "/branding/address-panel.jpeg",
      footerImageUrl: "/branding/footer-curves.jpeg",
    },
    create: {
      id: "default",
      academyName: "MR Academy",
      address: "",
      phonePrimary: "+91 9538840277",
      phoneSecondary: "+91 9845326115",
      email: "mracademyhubli@gmail.com",
      website: "www.mrswimmingacademy.com",
      gstNumber: "",
      gstEnabled: true,
      defaultCgstRate: 9,
      defaultSgstRate: 9,
      bankName: "State Bank of India",
      bankAccount: "12345678901234",
      bankIfsc: "SBIN0001234",
      bankBranch: "Main Branch",
      upiId: "mraacademy@upi",
      logoUrl: "/branding/logo.png",
      headerImageUrl: "/branding/address-panel.jpeg",
      footerImageUrl: "/branding/footer-curves.jpeg",
      brandColor: "#0070C0",
    },
  });

  const year = new Date().getFullYear();
  await prisma.invoiceSequence.upsert({
    where: { year },
    update: {},
    create: { year, lastNumber: 0 },
  });

  const plans = [
    { id: "spl_month_1", planName: "1 Month Swimming", description: "Monthly Package Without Coaching", duration: "1 Month", fees: 3540 },
    { id: "spl_month_2", planName: "2 Months Swimming", description: "Monthly Package Without Coaching", duration: "2 Months", fees: 5900 },
    { id: "spl_month_3", planName: "3 Months Swimming", description: "Monthly Package Without Coaching", duration: "3 Months", fees: 8260 },
    { id: "spl_month_6", planName: "6 Months Swimming", description: "Monthly Package Without Coaching", duration: "6 Months", fees: 14160 },
    { id: "spl_month_12", planName: "1 Year Swimming", description: "Monthly Package Without Coaching", duration: "1 Year", fees: 21240 },
    { id: "spl_coach_21", planName: "21 Classes Coaching", description: "Within 30 Days", duration: "30 Days", fees: 5000 },
    { id: "spl_casual_adult", planName: "Casual Swim Adult", description: "Per Hour", duration: "1 Hour", fees: 150 },
    { id: "spl_casual_child", planName: "Casual Swim Below 5 Years", description: "Per Hour", duration: "1 Hour", fees: 100 },
  ];
  for (const row of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: row.id },
      create: { ...row, isActive: true },
      update: { planName: row.planName, description: row.description, duration: row.duration, fees: row.fees, isActive: true },
    });
  }

  console.log("Database seeded successfully");
  console.log("Admin: admin / admin123");
  console.log("Receptionist: receptionist1 / reception123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
