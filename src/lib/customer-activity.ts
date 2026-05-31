import type { CustomerActivityType, Prisma } from "@prisma/client";
import { isSchemaDriftError } from "@/lib/invoice-filters";

export { getActiveInvoiceWhere, activeInvoiceWhere, activeInvoiceFilter, isSchemaDriftError } from "@/lib/invoice-filters";

export async function recordCustomerActivity(
  tx: Prisma.TransactionClient,
  customerId: string,
  type: CustomerActivityType,
  description: string
) {
  try {
    return await tx.customerActivity.create({
      data: { customerId, type, description },
    });
  } catch (error) {
    if (isSchemaDriftError(error)) {
      console.warn(
        "[recordCustomerActivity] CustomerActivity table missing — run: npx prisma migrate deploy"
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
