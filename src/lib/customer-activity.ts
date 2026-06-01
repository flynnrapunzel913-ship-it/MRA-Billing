import type { CustomerActivityType, Prisma } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";
import { isSchemaDriftError } from "@/lib/invoice-filters";
import { prisma } from "@/lib/prisma";

export { getActiveInvoiceWhere, activeInvoiceWhere, activeInvoiceFilter, isSchemaDriftError } from "@/lib/invoice-filters";

export type CustomerActivityDb = Prisma.TransactionClient | typeof prisma;

function isActivityLogError(error: unknown): boolean {
  if (isSchemaDriftError(error)) return true;
  if (error instanceof PrismaNamespace.PrismaClientKnownRequestError) {
    // P2028: tx closed after an earlier failure inside the same transaction
    return error.code === "P2028";
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("transaction not found") ||
      msg.includes("transaction api error") ||
      msg.includes("closed transaction")
    );
  }
  return false;
}

export function hasCustomerActivityDelegate(): boolean {
  const client = prisma as unknown as { customerActivity?: { create?: unknown } };
  return typeof client.customerActivity?.create === "function";
}

/** Best-effort CRM log — never fails invoice/customer flows. */
export async function recordCustomerActivity(
  db: CustomerActivityDb,
  customerId: string,
  type: CustomerActivityType,
  description: string
) {
  if (!hasCustomerActivityDelegate()) {
    return null;
  }

  try {
    return await db.customerActivity.create({
      data: { customerId, type, description },
    });
  } catch (error) {
    if (isActivityLogError(error)) {
      console.warn(
        "[recordCustomerActivity] Skipped activity log:",
        error instanceof Error ? error.message : error
      );
      return null;
    }
    throw error;
  }
}

export const activityTypeLabel: Record<CustomerActivityType, string> = {
  CUSTOMER_ADDED: "Customer Added",
  INVOICE_CREATED: "Invoice Created",
  PAYMENT_MADE: "Payment Made",
  PACKAGE_PURCHASED: "Package Purchased",
};
