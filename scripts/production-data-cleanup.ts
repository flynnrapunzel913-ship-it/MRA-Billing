/**
 * One-time production data cleanup.
 *
 * Preserves: SubscriptionPlan, AcademyProduct, Settings
 * Keeps exactly one admin: Rajesh Shetti / Rajesh.Shitti
 *
 * Usage:
 *   npx tsx scripts/production-data-cleanup.ts           # dry-run (default)
 *   npx tsx scripts/production-data-cleanup.ts --execute # perform cleanup
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { rm, mkdir, readdir } from "fs/promises";
import path from "path";
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { PrismaClient, Role, UserStatus } from "@prisma/client";

const prisma = new PrismaClient();

const KEEP_USERNAME = "Rajesh.Shitti";
const KEEP_NAME = "Rajesh Shetti";
const KEEP_PASSWORD = "admin@123";

const TABLES_TO_CLEAR = [
  "DailyCollectionHistory",
  "DailyCollection",
  "InvoiceItem",
  "Invoice",
  "CustomerActivity",
  "Customer",
  "Expense",
  "StockActivity",
  "StockEntry",
  "AuditLog",
  "UserActivity",
] as const;

const TABLES_TO_RESET = ["InvoiceSequence", "StockSequence"] as const;

const TABLES_PRESERVED = [
  "SubscriptionPlan",
  "AcademyProduct",
  "Settings",
] as const;

type DeleteCounts = Record<string, number>;

function resolveStorageDriver(): "local" | "r2" {
  const raw = process.env.STORAGE_DRIVER?.trim().toLowerCase();
  return raw === "r2" ? "r2" : "local";
}

async function countTable(name: string): Promise<number> {
  const delegate = (prisma as Record<string, { count: () => Promise<number> }>)[
    name.charAt(0).toLowerCase() + name.slice(1)
  ];
  if (!delegate?.count) throw new Error(`Unknown Prisma model: ${name}`);
  return delegate.count();
}

async function snapshotCounts(): Promise<Record<string, number>> {
  const names = [
    ...TABLES_TO_CLEAR,
    ...TABLES_TO_RESET,
    ...TABLES_PRESERVED,
    "User",
  ];
  const counts: Record<string, number> = {};
  for (const name of names) {
    counts[name] = await countTable(name);
  }
  return counts;
}

async function deleteStorageFiles(stockBillUrls: string[], execute: boolean) {
  const driver = resolveStorageDriver();
  const uploadRoot = path.join(process.cwd(), "uploads", "stock-bills");

  console.log(`\nStorage driver: ${driver}`);
  console.log(`Stock bill references in DB: ${stockBillUrls.length}`);

  if (!execute) {
    console.log("[dry-run] Would delete local uploads/stock-bills contents");
    if (driver === "r2") {
      console.log("[dry-run] Would delete R2 objects for stock bills + pending uploads");
    }
    return { localFilesRemoved: 0, r2ObjectsRemoved: 0 };
  }

  let localFilesRemoved = 0;
  let r2ObjectsRemoved = 0;

  if (driver === "r2") {
    const keys = new Set<string>();
    for (const url of stockBillUrls) {
      if (url?.trim()) keys.add(url.replace(/\\/g, "/").trim());
    }

    const listed = await listAllR2Objects();
    for (const key of listed) {
      if (key.startsWith("pending/") || key.endsWith("/bill.pdf")) {
        keys.add(key);
      }
    }

    r2ObjectsRemoved = await deleteR2Keys([...keys]);
  } else {
    try {
      const entries = await readdir(uploadRoot, { withFileTypes: true });
      localFilesRemoved = entries.length;
      await rm(uploadRoot, { recursive: true, force: true });
      await mkdir(path.join(uploadRoot, "pending"), { recursive: true });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw err;
      await mkdir(path.join(uploadRoot, "pending"), { recursive: true });
    }
  }

  return { localFilesRemoved, r2ObjectsRemoved };
}

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("R2 is configured as driver but R2_* env vars are missing");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function listAllR2Objects(): Promise<string[]> {
  const bucket = process.env.R2_BUCKET!.trim();
  const client = getR2Client();
  const keys: string[] = [];
  let token: string | undefined;

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: token,
      })
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);

  return keys;
}

async function deleteR2Keys(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  const bucket = process.env.R2_BUCKET!.trim();
  const client = getR2Client();
  let removed = 0;

  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    );
    removed += batch.length;
  }

  return removed;
}

async function ensureAdminUser(
  execute: boolean,
  passwordHash: string,
  tx?: Pick<PrismaClient, "user">
) {
  if (!execute) {
    console.log(
      `[dry-run] Would upsert admin user: ${KEEP_USERNAME} (${KEEP_NAME}), role ADMIN, active`
    );
    return null;
  }

  const db = tx ?? prisma;
  return db.user.upsert({
    where: { username: KEEP_USERNAME },
    create: {
      username: KEEP_USERNAME,
      name: KEEP_NAME,
      password: passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      email: null,
      sessionVersion: 0,
    },
    update: {
      name: KEEP_NAME,
      password: passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      sessionVersion: { increment: 1 },
    },
  });
}

async function runCleanup(execute: boolean) {
  const before = await snapshotCounts();

  console.log("=== PRODUCTION DATA CLEANUP ===");
  console.log(`Mode: ${execute ? "EXECUTE" : "DRY-RUN"}\n`);

  console.log("TABLES THAT WILL BE CLEARED (all rows deleted):");
  for (const table of TABLES_TO_CLEAR) {
    console.log(`  - ${table}: ${before[table]} row(s)`);
  }

  console.log("\nTABLES THAT WILL BE RESET (sequence counters → 0):");
  for (const table of TABLES_TO_RESET) {
    console.log(`  - ${table}: ${before[table]} row(s) — lastNumber reset to 0`);
  }

  console.log("\nUSERS:");
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, status: true },
    orderBy: { username: "asc" },
  });
  const usersToDelete = users.filter((u) => u.username !== KEEP_USERNAME);
  console.log(`  - Keep: ${KEEP_USERNAME} (${KEEP_NAME})`);
  console.log(`  - Delete: ${usersToDelete.length} user(s)`);
  for (const u of usersToDelete) {
    console.log(`      · ${u.username} (${u.name}) [${u.role}/${u.status}]`);
  }

  console.log("\nTABLES PRESERVED (no deletes):");
  for (const table of TABLES_PRESERVED) {
    console.log(`  - ${table}: ${before[table]} row(s)`);
  }

  console.log("\nOTHER:");
  console.log("  - Report cache: none (no DB table)");
  console.log("  - Settings: preserved as-is");
  console.log("  - Uploaded stock bill PDFs: removed from storage");

  if (!execute) {
    console.log("\n[dry-run] No changes made. Re-run with --execute to apply.");
    return { before, deleted: {} as DeleteCounts, after: before };
  }

  const stockEntries = await prisma.stockEntry.findMany({
    select: { billPdfUrl: true },
  });
  const billUrls = stockEntries
    .map((r) => r.billPdfUrl)
    .filter((u): u is string => Boolean(u?.trim()));

  const deleted: DeleteCounts = {};
  const passwordHash = await bcrypt.hash(KEEP_PASSWORD, 10);

  await prisma.$transaction(
    async (tx) => {
      deleted.DailyCollectionHistory = (
        await tx.dailyCollectionHistory.deleteMany()
      ).count;
      deleted.DailyCollection = (await tx.dailyCollection.deleteMany()).count;
      deleted.InvoiceItem = (await tx.invoiceItem.deleteMany()).count;
      deleted.Invoice = (await tx.invoice.deleteMany()).count;
      deleted.CustomerActivity = (await tx.customerActivity.deleteMany()).count;
      deleted.Customer = (await tx.customer.deleteMany()).count;
      deleted.Expense = (await tx.expense.deleteMany()).count;
      deleted.StockActivity = (await tx.stockActivity.deleteMany()).count;
      deleted.StockEntry = (await tx.stockEntry.deleteMany()).count;
      deleted.AuditLog = (await tx.auditLog.deleteMany()).count;
      deleted.UserActivity = (await tx.userActivity.deleteMany()).count;

      const admin = await ensureAdminUser(true, passwordHash, tx);
      if (!admin) throw new Error("Failed to create admin user");

      deleted.User = (
        await tx.user.deleteMany({
          where: { id: { not: admin.id } },
        })
      ).count;

      deleted.InvoiceSequence = (
        await tx.invoiceSequence.updateMany({ data: { lastNumber: 0 } })
      ).count;
      deleted.StockSequence = (
        await tx.stockSequence.updateMany({ data: { lastNumber: 0 } })
      ).count;
    },
    { maxWait: 60_000, timeout: 120_000 }
  );

  const storage = await deleteStorageFiles(billUrls, true);

  const after = await snapshotCounts();
  const remainingUsers = await prisma.user.findMany({
    select: { username: true, name: true, role: true, status: true },
  });
  const remainingProducts = await prisma.academyProduct.findMany({
    select: { id: true, name: true, price: true, status: true },
    orderBy: { name: "asc" },
  });
  const remainingPlans = await prisma.subscriptionPlan.findMany({
    select: { id: true, planName: true, fees: true, isActive: true },
    orderBy: { planName: "asc" },
  });

  console.log("\n=== CLEANUP COMPLETE ===\n");
  console.log("Records deleted / reset:");
  for (const [table, count] of Object.entries(deleted)) {
    console.log(`  - ${table}: ${count}`);
  }
  console.log(
    `  - storage (local dirs cleared / R2 objects): ${storage.localFilesRemoved} local, ${storage.r2ObjectsRemoved} R2`
  );

  console.log("\nRemaining users:");
  for (const u of remainingUsers) {
    console.log(`  - ${u.username} (${u.name}) [${u.role}/${u.status}]`);
  }

  console.log(`\nRemaining products (AcademyProduct): ${remainingProducts.length}`);
  for (const p of remainingProducts) {
    console.log(`  - ${p.name} — ₹${p.price} [${p.status}]`);
  }

  console.log(`\nRemaining subscription plans: ${remainingPlans.length}`);
  for (const plan of remainingPlans) {
    console.log(`  - ${plan.planName} — ₹${plan.fees} [${plan.isActive ? "active" : "inactive"}]`);
  }

  console.log("\nPost-cleanup table counts:");
  for (const [table, count] of Object.entries(after)) {
    console.log(`  - ${table}: ${count}`);
  }

  return { before, deleted, after };
}

const execute = process.argv.includes("--execute");

runCleanup(execute)
  .catch((error) => {
    console.error("\nCleanup failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
