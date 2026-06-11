import { prisma } from "@/lib/prisma";
import { toJsonNumber } from "@/lib/serialize-prisma";

export const BACKUP_SCHEMA_VERSION = "S2-15";

export type DatabaseBackup = {
  exportedAt: string;
  schemaVersion: string;
  counts: {
    users: number;
    userActivities: number;
    customers: number;
    customerActivities: number;
    invoices: number;
    invoiceItems: number;
    invoiceSequences: number;
    settings: number;
    subscriptionCategories: number;
    subscriptionPlans: number;
    academyProducts: number;
    stockSequences: number;
    stockEntries: number;
    stockActivities: number;
    auditLogs: number;
  };
  data: {
    users: unknown[];
    userActivities: unknown[];
    customers: unknown[];
    customerActivities: unknown[];
    invoices: unknown[];
    invoiceItems: unknown[];
    invoiceSequences: unknown[];
    settings: unknown[];
    subscriptionCategories: unknown[];
    subscriptionPlans: unknown[];
    academyProducts: unknown[];
    stockSequences: unknown[];
    stockEntries: unknown[];
    stockActivities: unknown[];
    auditLogs: unknown[];
  };
};

function isPrismaDecimal(value: unknown): value is { toNumber: () => number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber: unknown }).toNumber === "function"
  );
}

/** Recursively coerce Prisma Date and Decimal values for JSON backup output. */
export function serializeForBackup<T>(value: T): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (isPrismaDecimal(value)) return toJsonNumber(value);
  if (Array.isArray(value)) return value.map((item) => serializeForBackup(item));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = serializeForBackup(nested);
    }
    return out;
  }
  return value;
}

export async function generateDatabaseBackup(): Promise<DatabaseBackup> {
  const [
    users,
    userActivities,
    customers,
    customerActivities,
    invoices,
    invoiceItems,
    invoiceSequences,
    settings,
    subscriptionCategories,
    subscriptionPlans,
    academyProducts,
    stockSequences,
    stockEntries,
    stockActivities,
    auditLogs,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.userActivity.findMany(),
    prisma.customer.findMany(),
    prisma.customerActivity.findMany(),
    prisma.invoice.findMany(),
    prisma.invoiceItem.findMany(),
    prisma.invoiceSequence.findMany(),
    prisma.settings.findMany(),
    prisma.subscriptionCategory.findMany(),
    prisma.subscriptionPlan.findMany(),
    prisma.academyProduct.findMany(),
    prisma.stockSequence.findMany(),
    prisma.stockEntry.findMany(),
    prisma.stockActivity.findMany(),
    prisma.auditLog.findMany(),
  ]);

  const counts = {
    users: users.length,
    userActivities: userActivities.length,
    customers: customers.length,
    customerActivities: customerActivities.length,
    invoices: invoices.length,
    invoiceItems: invoiceItems.length,
    invoiceSequences: invoiceSequences.length,
    settings: settings.length,
    subscriptionCategories: subscriptionCategories.length,
    subscriptionPlans: subscriptionPlans.length,
    academyProducts: academyProducts.length,
    stockSequences: stockSequences.length,
    stockEntries: stockEntries.length,
    stockActivities: stockActivities.length,
    auditLogs: auditLogs.length,
  };

  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: BACKUP_SCHEMA_VERSION,
    counts,
    data: {
      users: serializeForBackup(users) as unknown[],
      userActivities: serializeForBackup(userActivities) as unknown[],
      customers: serializeForBackup(customers) as unknown[],
      customerActivities: serializeForBackup(customerActivities) as unknown[],
      invoices: serializeForBackup(invoices) as unknown[],
      invoiceItems: serializeForBackup(invoiceItems) as unknown[],
      invoiceSequences: serializeForBackup(invoiceSequences) as unknown[],
      settings: serializeForBackup(settings) as unknown[],
      subscriptionCategories: serializeForBackup(subscriptionCategories) as unknown[],
      subscriptionPlans: serializeForBackup(subscriptionPlans) as unknown[],
      academyProducts: serializeForBackup(academyProducts) as unknown[],
      stockSequences: serializeForBackup(stockSequences) as unknown[],
      stockEntries: serializeForBackup(stockEntries) as unknown[],
      stockActivities: serializeForBackup(stockActivities) as unknown[],
      auditLogs: serializeForBackup(auditLogs) as unknown[],
    },
  };
}
