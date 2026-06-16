import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  BACKUP_SCHEMA_VERSION,
  type DatabaseBackup,
} from "@/lib/backup-export";

export class BackupRestoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupRestoreError";
  }
}

const DATA_KEYS = [
  "users",
  "userActivities",
  "customers",
  "customerActivities",
  "invoices",
  "invoiceItems",
  "invoiceSequences",
  "settings",
  "subscriptionPlans",
  "academyProducts",
  "stockSequences",
  "stockEntries",
  "stockActivities",
  "expenses",
  "dailyCollections",
  "dailyCollectionHistories",
  "auditLogs",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new BackupRestoreError(`Invalid backup: missing or invalid ${field}`);
  }
  return value;
}

function optionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new BackupRestoreError("Invalid backup: expected string or null");
  }
  return value;
}

function requireNumber(row: Record<string, unknown>, field: string): number {
  const value = row[field];
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new BackupRestoreError(`Invalid backup: missing or invalid ${field}`);
  }
  return value;
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new BackupRestoreError("Invalid backup: expected number or null");
  }
  return value;
}

function requireInt(row: Record<string, unknown>, field: string): number {
  const value = requireNumber(row, field);
  if (!Number.isInteger(value)) {
    throw new BackupRestoreError(`Invalid backup: ${field} must be an integer`);
  }
  return value;
}

function requireBoolean(row: Record<string, unknown>, field: string): boolean {
  const value = row[field];
  if (typeof value !== "boolean") {
    throw new BackupRestoreError(`Invalid backup: missing or invalid ${field}`);
  }
  return value;
}

function parseDateValue(value: unknown, field: string): Date {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new BackupRestoreError(`Invalid backup: invalid date for ${field}`);
  }
  return new Date(value);
}

function optionalDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  return parseDateValue(value, "date");
}

function asRows(value: unknown, section: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new BackupRestoreError(`Invalid backup: data.${section} must be an array`);
  }
  for (const row of value) {
    if (!isRecord(row)) {
      throw new BackupRestoreError(`Invalid backup: data.${section} contains invalid rows`);
    }
  }
  return value as Record<string, unknown>[];
}

function collectIds(rows: Record<string, unknown>[], label: string): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    const id = requireString(row, "id");
    if (ids.has(id)) {
      throw new BackupRestoreError(`Invalid backup: duplicate ${label} id ${id}`);
    }
    ids.add(id);
  }
  return ids;
}

function assertUniqueField(
  rows: Record<string, unknown>[],
  field: string,
  label: string
): void {
  const seen = new Set<string>();
  for (const row of rows) {
    const value = row[field];
    if (value === null || value === undefined) continue;
    if (typeof value !== "string" && typeof value !== "number") {
      throw new BackupRestoreError(`Invalid backup: invalid ${field} in ${label}`);
    }
    const key = String(value);
    if (seen.has(key)) {
      throw new BackupRestoreError(`Invalid backup: duplicate ${label} ${field} ${key}`);
    }
    seen.add(key);
  }
}

export function parseBackupFile(raw: string): DatabaseBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BackupRestoreError("Invalid backup JSON");
  }

  if (!isRecord(parsed)) {
    throw new BackupRestoreError("Invalid backup: root must be an object");
  }

  if (parsed.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new BackupRestoreError(
      `Unsupported backup schema version: expected ${BACKUP_SCHEMA_VERSION}`
    );
  }

  if (typeof parsed.exportedAt !== "string" || !parsed.exportedAt.trim()) {
    throw new BackupRestoreError("Invalid backup: exportedAt is required");
  }

  if (!isRecord(parsed.counts) || !isRecord(parsed.data)) {
    throw new BackupRestoreError("Invalid backup: counts and data are required");
  }

  const data: DatabaseBackup["data"] = {
    users: [],
    userActivities: [],
    customers: [],
    customerActivities: [],
    invoices: [],
    invoiceItems: [],
    invoiceSequences: [],
    settings: [],
    subscriptionPlans: [],
    academyProducts: [],
    stockSequences: [],
    stockEntries: [],
    stockActivities: [],
    expenses: [],
    dailyCollections: [],
    dailyCollectionHistories: [],
    auditLogs: [],
  };

  for (const key of DATA_KEYS) {
    data[key] = asRows(parsed.data[key], key);
  }

  const counts = parsed.counts as DatabaseBackup["counts"];
  for (const key of DATA_KEYS) {
    const count = counts[key];
    if (typeof count !== "number" || count < 0 || !Number.isInteger(count)) {
      throw new BackupRestoreError(`Invalid backup: counts.${key} must be a non-negative integer`);
    }
    if (count !== data[key].length) {
      throw new BackupRestoreError(
        `Invalid backup: counts.${key} (${count}) does not match data length (${data[key].length})`
      );
    }
  }

  return {
    exportedAt: parsed.exportedAt,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    counts,
    data,
  };
}

export function validateBackupForRestore(backup: DatabaseBackup): void {
  const users = backup.data.users as Record<string, unknown>[];
  const userIds = collectIds(users, "user");
  const hasAdmin = users.some((row) => row.role === Role.ADMIN);
  if (!hasAdmin) {
    throw new BackupRestoreError("Invalid backup: at least one ADMIN user is required");
  }

  assertUniqueField(users, "username", "user");
  assertUniqueField(
    users.filter((u) => typeof u.email === "string" && u.email.trim()),
    "email",
    "user"
  );

  const customers = backup.data.customers as Record<string, unknown>[];
  const customerIds = collectIds(customers, "customer");
  assertUniqueField(customers, "membershipId", "customer");

  const invoices = backup.data.invoices as Record<string, unknown>[];
  const invoiceIds = collectIds(invoices, "invoice");
  assertUniqueField(invoices, "invoiceNumber", "invoice");

  for (const row of invoices) {
    const createdById = requireString(row, "createdById");
    if (!userIds.has(createdById)) {
      throw new BackupRestoreError(`Invalid backup: invoice references unknown user ${createdById}`);
    }
    const customerId = row.customerId;
    if (customerId !== null && customerId !== undefined) {
      if (typeof customerId !== "string" || !customerIds.has(customerId)) {
        throw new BackupRestoreError("Invalid backup: invoice references unknown customer");
      }
    }
  }

  const invoiceItems = backup.data.invoiceItems as Record<string, unknown>[];
  collectIds(invoiceItems, "invoiceItem");
  for (const row of invoiceItems) {
    const invoiceId = requireString(row, "invoiceId");
    if (!invoiceIds.has(invoiceId)) {
      throw new BackupRestoreError(`Invalid backup: invoice item references unknown invoice ${invoiceId}`);
    }
  }

  const stockEntries = backup.data.stockEntries as Record<string, unknown>[];
  const stockEntryIds = collectIds(stockEntries, "stockEntry");
  assertUniqueField(stockEntries, "stockNumber", "stockEntry");
  for (const row of stockEntries) {
    const createdById = requireString(row, "createdById");
    if (!userIds.has(createdById)) {
      throw new BackupRestoreError(`Invalid backup: stock entry references unknown user ${createdById}`);
    }
  }

  for (const row of backup.data.userActivities as Record<string, unknown>[]) {
    const userId = requireString(row, "userId");
    if (!userIds.has(userId)) {
      throw new BackupRestoreError("Invalid backup: user activity references unknown user");
    }
  }

  for (const row of backup.data.customerActivities as Record<string, unknown>[]) {
    const customerId = requireString(row, "customerId");
    if (!customerIds.has(customerId)) {
      throw new BackupRestoreError("Invalid backup: customer activity references unknown customer");
    }
  }

  for (const row of backup.data.stockActivities as Record<string, unknown>[]) {
    const stockEntryId = requireString(row, "stockEntryId");
    const userId = requireString(row, "userId");
    if (!stockEntryIds.has(stockEntryId)) {
      throw new BackupRestoreError("Invalid backup: stock activity references unknown stock entry");
    }
    if (!userIds.has(userId)) {
      throw new BackupRestoreError("Invalid backup: stock activity references unknown user");
    }
  }

  collectIds(backup.data.expenses as Record<string, unknown>[], "expense");
  for (const row of backup.data.expenses as Record<string, unknown>[]) {
    const createdById = requireString(row, "createdById");
    if (!userIds.has(createdById)) {
      throw new BackupRestoreError("Invalid backup: expense references unknown user");
    }
  }

  const dailyCollections = backup.data.dailyCollections as Record<string, unknown>[];
  const dailyCollectionIds = collectIds(dailyCollections, "dailyCollection");
  assertUniqueField(dailyCollections, "collectionDate", "dailyCollection");
  for (const row of dailyCollections) {
    const collectedByUserId = requireString(row, "collectedByUserId");
    if (!userIds.has(collectedByUserId)) {
      throw new BackupRestoreError("Invalid backup: daily collection references unknown user");
    }
  }

  collectIds(backup.data.dailyCollectionHistories as Record<string, unknown>[], "dailyCollectionHistory");
  for (const row of backup.data.dailyCollectionHistories as Record<string, unknown>[]) {
    const dailyCollectionId = requireString(row, "dailyCollectionId");
    const editedById = requireString(row, "editedById");
    if (!dailyCollectionIds.has(dailyCollectionId)) {
      throw new BackupRestoreError(
        "Invalid backup: daily collection history references unknown daily collection"
      );
    }
    if (!userIds.has(editedById)) {
      throw new BackupRestoreError(
        "Invalid backup: daily collection history references unknown user"
      );
    }
  }

  const auditLogs = backup.data.auditLogs as Record<string, unknown>[];
  collectIds(auditLogs, "auditLog");
  for (const row of auditLogs) {
    const userId = row.userId;
    if (userId !== null && userId !== undefined) {
      if (typeof userId !== "string" || !userIds.has(userId)) {
        throw new BackupRestoreError("Invalid backup: audit log references unknown user");
      }
    }
  }

  assertUniqueField(backup.data.invoiceSequences as Record<string, unknown>[], "year", "invoiceSequence");
  assertUniqueField(backup.data.stockSequences as Record<string, unknown>[], "year", "stockSequence");
  collectIds(backup.data.invoiceSequences as Record<string, unknown>[], "invoiceSequence");
  collectIds(backup.data.stockSequences as Record<string, unknown>[], "stockSequence");
  collectIds(backup.data.settings as Record<string, unknown>[], "settings");
  const planIds = collectIds(
    backup.data.subscriptionPlans as Record<string, unknown>[],
    "subscriptionPlan"
  );

  for (const row of invoiceItems) {
    const planId = row.subscriptionPlanId;
    if (planId !== null && planId !== undefined) {
      if (typeof planId !== "string" || !planIds.has(planId)) {
        throw new BackupRestoreError(
          "Invalid backup: invoice item references unknown subscription plan"
        );
      }
    }
  }

  collectIds(backup.data.academyProducts as Record<string, unknown>[], "academyProduct");
}

function mapUser(row: Record<string, unknown>): Prisma.UserCreateManyInput {
  return {
    id: requireString(row, "id"),
    username: requireString(row, "username"),
    email: optionalString(row.email),
    password: requireString(row, "password"),
    name: requireString(row, "name"),
    role: requireString(row, "role") as Role,
    status: requireString(row, "status") as Prisma.UserCreateManyInput["status"],
    sessionVersion: requireInt(row, "sessionVersion"),
    uiFontFamily: requireString(row, "uiFontFamily"),
    uiFontSize: requireString(row, "uiFontSize"),
    createdAt: parseDateValue(row.createdAt, "createdAt"),
    updatedAt: parseDateValue(row.updatedAt, "updatedAt"),
  };
}

function mapCustomer(row: Record<string, unknown>): Prisma.CustomerCreateManyInput {
  return {
    id: requireString(row, "id"),
    name: requireString(row, "name"),
    mobile: optionalString(row.mobile),
    email: optionalString(row.email),
    address: optionalString(row.address),
    emergencyContact: optionalString(row.emergencyContact),
    parentName: optionalString(row.parentName),
    gstNumber: optionalString(row.gstNumber),
    membershipId: requireString(row, "membershipId"),
    dateJoined: parseDateValue(row.dateJoined, "dateJoined"),
    status: requireString(row, "status") as Prisma.CustomerCreateManyInput["status"],
    deletedAt: optionalDate(row.deletedAt),
    createdAt: parseDateValue(row.createdAt, "createdAt"),
    updatedAt: parseDateValue(row.updatedAt, "updatedAt"),
  };
}

function mapSettings(row: Record<string, unknown>): Prisma.SettingsCreateManyInput {
  return {
    id: requireString(row, "id"),
    academyName: requireString(row, "academyName"),
    address: requireString(row, "address"),
    phonePrimary: requireString(row, "phonePrimary"),
    phoneSecondary: optionalString(row.phoneSecondary),
    email: requireString(row, "email"),
    website: optionalString(row.website),
    gstNumber: requireString(row, "gstNumber"),
    gstEnabled: requireBoolean(row, "gstEnabled"),
    defaultCgstRate: requireNumber(row, "defaultCgstRate"),
    defaultSgstRate: requireNumber(row, "defaultSgstRate"),
    bankName: optionalString(row.bankName),
    bankAccount: optionalString(row.bankAccount),
    bankIfsc: optionalString(row.bankIfsc),
    bankBranch: optionalString(row.bankBranch),
    upiId: optionalString(row.upiId),
    upiQrCode: optionalString(row.upiQrCode),
    logoUrl: requireString(row, "logoUrl"),
    signatureUrl: optionalString(row.signatureUrl),
    footerImageUrl: requireString(row, "footerImageUrl"),
    headerImageUrl: requireString(row, "headerImageUrl"),
    brandColor: requireString(row, "brandColor"),
    termsAndConditions: requireString(row, "termsAndConditions"),
    updatedAt: parseDateValue(row.updatedAt, "updatedAt"),
  };
}

function mapSubscriptionPlan(row: Record<string, unknown>): Prisma.SubscriptionPlanCreateManyInput {
  return {
    id: requireString(row, "id"),
    planName: requireString(row, "planName"),
    description: optionalString(row.description),
    duration: requireString(row, "duration"),
    durationValue: row.durationValue == null ? 1 : requireInt(row, "durationValue"),
    durationUnit:
      (optionalString(row.durationUnit) as Prisma.SubscriptionPlanCreateManyInput["durationUnit"]) ??
      "MONTHS",
    usageDays: row.usageDays == null ? null : requireInt(row, "usageDays"),
    fees: requireNumber(row, "fees"),
    isActive: requireBoolean(row, "isActive"),
    createdAt: parseDateValue(row.createdAt, "createdAt"),
    updatedAt: parseDateValue(row.updatedAt, "updatedAt"),
  };
}

function mapAcademyProduct(row: Record<string, unknown>): Prisma.AcademyProductCreateManyInput {
  return {
    id: requireString(row, "id"),
    name: requireString(row, "name"),
    description: optionalString(row.description),
    price: requireNumber(row, "price"),
    status: requireString(row, "status") as Prisma.AcademyProductCreateManyInput["status"],
    createdAt: parseDateValue(row.createdAt, "createdAt"),
    updatedAt: parseDateValue(row.updatedAt, "updatedAt"),
  };
}

function mapInvoiceSequence(row: Record<string, unknown>): Prisma.InvoiceSequenceCreateManyInput {
  return {
    id: requireString(row, "id"),
    year: requireInt(row, "year"),
    lastNumber: requireInt(row, "lastNumber"),
  };
}

function mapStockSequence(row: Record<string, unknown>): Prisma.StockSequenceCreateManyInput {
  return {
    id: requireString(row, "id"),
    year: requireInt(row, "year"),
    lastNumber: requireInt(row, "lastNumber"),
  };
}

function mapInvoice(row: Record<string, unknown>): Prisma.InvoiceCreateManyInput {
  return {
    id: requireString(row, "id"),
    invoiceNumber: requireString(row, "invoiceNumber"),
    invoiceDate: parseDateValue(row.invoiceDate, "invoiceDate"),
    dueDate: parseDateValue(row.dueDate, "dueDate"),
    customerId: optionalString(row.customerId),
    customerName: requireString(row, "customerName"),
    customerMobile: optionalString(row.customerMobile),
    customerAddress: optionalString(row.customerAddress),
    customerGst: optionalString(row.customerGst),
    subtotal: requireNumber(row, "subtotal"),
    cgstRate: requireNumber(row, "cgstRate"),
    sgstRate: requireNumber(row, "sgstRate"),
    cgstAmount: requireNumber(row, "cgstAmount"),
    sgstAmount: requireNumber(row, "sgstAmount"),
    totalGst: requireNumber(row, "totalGst"),
    grandTotal: requireNumber(row, "grandTotal"),
    amountInWords: requireString(row, "amountInWords"),
    paymentStatus: requireString(row, "paymentStatus") as Prisma.InvoiceCreateManyInput["paymentStatus"],
    paymentMethod: requireString(row, "paymentMethod") as Prisma.InvoiceCreateManyInput["paymentMethod"],
    amountPaid: requireNumber(row, "amountPaid"),
    amountRemaining: requireNumber(row, "amountRemaining"),
    gstEnabled: requireBoolean(row, "gstEnabled"),
    notes: optionalString(row.notes),
    createdById: requireString(row, "createdById"),
    createdAt: parseDateValue(row.createdAt, "createdAt"),
    updatedAt: parseDateValue(row.updatedAt, "updatedAt"),
    deletedAt: optionalDate(row.deletedAt),
  };
}

function mapInvoiceItem(row: Record<string, unknown>): Prisma.InvoiceItemCreateManyInput {
  return {
    id: requireString(row, "id"),
    invoiceId: requireString(row, "invoiceId"),
    slNo: requireInt(row, "slNo"),
    itemType: requireString(row, "itemType"),
    description: requireString(row, "description"),
    quantity: requireInt(row, "quantity"),
    unitPrice: requireNumber(row, "unitPrice"),
    amount: requireNumber(row, "amount"),
    packageStartDate: optionalDate(row.packageStartDate),
    packageEndDate: optionalDate(row.packageEndDate),
    subscriptionPlanId: optionalString(row.subscriptionPlanId),
    planNameSnapshot: optionalString(row.planNameSnapshot),
    descriptionSnapshot: optionalString(row.descriptionSnapshot),
    durationSnapshot: optionalString(row.durationSnapshot),
    durationValueSnapshot:
      row.durationValueSnapshot == null ? null : requireInt(row, "durationValueSnapshot"),
    durationUnitSnapshot:
      optionalString(row.durationUnitSnapshot) as Prisma.InvoiceItemCreateManyInput["durationUnitSnapshot"],
    usageDaysSnapshot:
      row.usageDaysSnapshot == null ? null : requireInt(row, "usageDaysSnapshot"),
    feesSnapshot:
      row.feesSnapshot === null || row.feesSnapshot === undefined
        ? null
        : requireNumber(row, "feesSnapshot"),
  };
}

function mapStockEntry(row: Record<string, unknown>): Prisma.StockEntryCreateManyInput {
  return {
    id: requireString(row, "id"),
    stockNumber: requireString(row, "stockNumber"),
    itemName: requireString(row, "itemName"),
    category: requireString(row, "category"),
    quantityPurchased: requireInt(row, "quantityPurchased"),
    totalCost: requireNumber(row, "totalCost"),
    supplierName: requireString(row, "supplierName"),
    purchaseDate: parseDateValue(row.purchaseDate, "purchaseDate"),
    billPdfUrl: optionalString(row.billPdfUrl),
    billFileName: optionalString(row.billFileName),
    remarks: optionalString(row.remarks),
    createdById: requireString(row, "createdById"),
    deletedAt: optionalDate(row.deletedAt),
    createdAt: parseDateValue(row.createdAt, "createdAt"),
    updatedAt: parseDateValue(row.updatedAt, "updatedAt"),
  };
}

function mapUserActivity(row: Record<string, unknown>): Prisma.UserActivityCreateManyInput {
  return {
    id: requireString(row, "id"),
    userId: requireString(row, "userId"),
    type: requireString(row, "type") as Prisma.UserActivityCreateManyInput["type"],
    description: requireString(row, "description"),
    createdAt: parseDateValue(row.createdAt, "createdAt"),
  };
}

function mapCustomerActivity(row: Record<string, unknown>): Prisma.CustomerActivityCreateManyInput {
  return {
    id: requireString(row, "id"),
    customerId: requireString(row, "customerId"),
    type: requireString(row, "type") as Prisma.CustomerActivityCreateManyInput["type"],
    description: requireString(row, "description"),
    createdAt: parseDateValue(row.createdAt, "createdAt"),
  };
}

function mapStockActivity(row: Record<string, unknown>): Prisma.StockActivityCreateManyInput {
  return {
    id: requireString(row, "id"),
    stockEntryId: requireString(row, "stockEntryId"),
    userId: requireString(row, "userId"),
    type: requireString(row, "type") as Prisma.StockActivityCreateManyInput["type"],
    description: requireString(row, "description"),
    ipAddress: optionalString(row.ipAddress),
    userAgent: optionalString(row.userAgent),
    createdAt: parseDateValue(row.createdAt, "createdAt"),
  };
}

function mapAuditLog(row: Record<string, unknown>): Prisma.AuditLogCreateManyInput {
  return {
    id: requireString(row, "id"),
    userId: optionalString(row.userId),
    username: optionalString(row.username),
    action: requireString(row, "action"),
    entityType: optionalString(row.entityType),
    entityId: optionalString(row.entityId),
    details: row.details === null || row.details === undefined ? undefined : (row.details as Prisma.InputJsonValue),
    ipAddress: optionalString(row.ipAddress),
    createdAt: parseDateValue(row.createdAt, "createdAt"),
  };
}

function mapExpense(row: Record<string, unknown>): Prisma.ExpenseCreateManyInput {
  return {
    id: requireString(row, "id"),
    expenseDate: parseDateValue(row.expenseDate, "expenseDate"),
    paidTo: requireString(row, "paidTo"),
    reason: requireString(row, "reason"),
    amount: requireNumber(row, "amount"),
    paymentMode: requireString(row, "paymentMode") as Prisma.ExpenseCreateManyInput["paymentMode"],
    createdById: requireString(row, "createdById"),
    createdAt: parseDateValue(row.createdAt, "createdAt"),
    updatedAt: parseDateValue(row.updatedAt, "updatedAt"),
  };
}

function mapDailyCollection(row: Record<string, unknown>): Prisma.DailyCollectionCreateManyInput {
  return {
    id: requireString(row, "id"),
    collectionDate: parseDateValue(row.collectionDate, "collectionDate"),
    notes: optionalString(row.notes),
    collectedAt: parseDateValue(row.collectedAt, "collectedAt"),
    collectedByUserId: requireString(row, "collectedByUserId"),
    collectedByName: optionalString(row.collectedByName),
    totalRevenue: optionalNumber(row.totalRevenue),
    subscriptionRevenue: optionalNumber(row.subscriptionRevenue),
    productRevenue: optionalNumber(row.productRevenue),
    totalExpenses: optionalNumber(row.totalExpenses),
    cashCollectedSystem: optionalNumber(row.cashCollectedSystem),
    upiCollected: optionalNumber(row.upiCollected),
    netCollection: optionalNumber(row.netCollection),
    cashCountedPhysical: optionalNumber(row.cashCountedPhysical),
    cashDifference: optionalNumber(row.cashDifference),
    cashDifferenceNotes: optionalString(row.cashDifferenceNotes),
    cashDenominations:
      row.cashDenominations === null || row.cashDenominations === undefined
        ? undefined
        : (row.cashDenominations as Prisma.InputJsonValue),
    originalSnapshotJson:
      row.originalSnapshotJson === null || row.originalSnapshotJson === undefined
        ? undefined
        : (row.originalSnapshotJson as Prisma.InputJsonValue),
    createdAt: parseDateValue(row.createdAt, "createdAt"),
    updatedAt: parseDateValue(row.updatedAt, "updatedAt"),
  };
}

function mapDailyCollectionHistory(
  row: Record<string, unknown>
): Prisma.DailyCollectionHistoryCreateManyInput {
  return {
    id: requireString(row, "id"),
    dailyCollectionId: requireString(row, "dailyCollectionId"),
    editedById: requireString(row, "editedById"),
    createdAt: parseDateValue(row.createdAt, "createdAt"),
    changesJson: row.changesJson as Prisma.InputJsonValue,
  };
}

const RESTORE_TX_OPTIONS = { maxWait: 30_000, timeout: 120_000 } as const;

export async function restoreDatabaseFromBackup(
  backup: DatabaseBackup
): Promise<DatabaseBackup["counts"]> {
  validateBackupForRestore(backup);

  const rows = backup.data;

  await prisma.$transaction(async (tx) => {
    await tx.dailyCollectionHistory.deleteMany();
    await tx.dailyCollection.deleteMany();
    await tx.expense.deleteMany();
    await tx.stockActivity.deleteMany();
    await tx.customerActivity.deleteMany();
    await tx.userActivity.deleteMany();
    await tx.invoiceItem.deleteMany();
    await tx.auditLog.deleteMany();
    await tx.invoice.deleteMany();
    await tx.stockEntry.deleteMany();
    await tx.customer.deleteMany();
    await tx.user.deleteMany();
    await tx.subscriptionPlan.deleteMany();
    await tx.academyProduct.deleteMany();
    await tx.invoiceSequence.deleteMany();
    await tx.stockSequence.deleteMany();
    await tx.settings.deleteMany();

    const users = rows.users as Record<string, unknown>[];
    if (users.length > 0) {
      await tx.user.createMany({ data: users.map(mapUser) });
    }

    const customers = rows.customers as Record<string, unknown>[];
    if (customers.length > 0) {
      await tx.customer.createMany({ data: customers.map(mapCustomer) });
    }

    const settings = rows.settings as Record<string, unknown>[];
    if (settings.length > 0) {
      await tx.settings.createMany({ data: settings.map(mapSettings) });
    }

    const subscriptionPlans = rows.subscriptionPlans as Record<string, unknown>[];
    if (subscriptionPlans.length > 0) {
      await tx.subscriptionPlan.createMany({
        data: subscriptionPlans.map(mapSubscriptionPlan),
      });
    }

    const academyProducts = rows.academyProducts as Record<string, unknown>[];
    if (academyProducts.length > 0) {
      await tx.academyProduct.createMany({ data: academyProducts.map(mapAcademyProduct) });
    }

    const invoiceSequences = rows.invoiceSequences as Record<string, unknown>[];
    if (invoiceSequences.length > 0) {
      await tx.invoiceSequence.createMany({ data: invoiceSequences.map(mapInvoiceSequence) });
    }

    const stockSequences = rows.stockSequences as Record<string, unknown>[];
    if (stockSequences.length > 0) {
      await tx.stockSequence.createMany({ data: stockSequences.map(mapStockSequence) });
    }

    const invoices = rows.invoices as Record<string, unknown>[];
    if (invoices.length > 0) {
      await tx.invoice.createMany({ data: invoices.map(mapInvoice) });
    }

    const invoiceItems = rows.invoiceItems as Record<string, unknown>[];
    if (invoiceItems.length > 0) {
      await tx.invoiceItem.createMany({ data: invoiceItems.map(mapInvoiceItem) });
    }

    const stockEntries = rows.stockEntries as Record<string, unknown>[];
    if (stockEntries.length > 0) {
      await tx.stockEntry.createMany({ data: stockEntries.map(mapStockEntry) });
    }

    const expenses = rows.expenses as Record<string, unknown>[];
    if (expenses.length > 0) {
      await tx.expense.createMany({ data: expenses.map(mapExpense) });
    }

    const dailyCollections = rows.dailyCollections as Record<string, unknown>[];
    if (dailyCollections.length > 0) {
      await tx.dailyCollection.createMany({ data: dailyCollections.map(mapDailyCollection) });
    }

    const dailyCollectionHistories = rows.dailyCollectionHistories as Record<string, unknown>[];
    if (dailyCollectionHistories.length > 0) {
      await tx.dailyCollectionHistory.createMany({
        data: dailyCollectionHistories.map(mapDailyCollectionHistory),
      });
    }

    const userActivities = rows.userActivities as Record<string, unknown>[];
    if (userActivities.length > 0) {
      await tx.userActivity.createMany({ data: userActivities.map(mapUserActivity) });
    }

    const customerActivities = rows.customerActivities as Record<string, unknown>[];
    if (customerActivities.length > 0) {
      await tx.customerActivity.createMany({ data: customerActivities.map(mapCustomerActivity) });
    }

    const stockActivities = rows.stockActivities as Record<string, unknown>[];
    if (stockActivities.length > 0) {
      await tx.stockActivity.createMany({ data: stockActivities.map(mapStockActivity) });
    }

    const auditLogs = rows.auditLogs as Record<string, unknown>[];
    if (auditLogs.length > 0) {
      await tx.auditLog.createMany({ data: auditLogs.map(mapAuditLog) });
    }
  }, RESTORE_TX_OPTIONS);

  return backup.counts;
}
