import type { Prisma } from "@prisma/client";

/** Invoice payment statuses that count toward collected revenue. */
export const COLLECTED_PAYMENT_STATUSES = ["FULLY_PAID", "PARTIALLY_PAID"] as const;

/**
 * Active invoices with money received — matches daily collection and financial summary.
 */
export function getCollectedInvoiceWhere(
  baseWhere: Prisma.InvoiceWhereInput = {}
): Prisma.InvoiceWhereInput {
  return {
    ...baseWhere,
    paymentStatus: { in: [...COLLECTED_PAYMENT_STATUSES] },
    amountPaid: { gt: 0 },
  };
}

export function invoiceCollectedAmount(invoice: {
  amountPaid?: unknown;
  grandTotal?: unknown;
}): number {
  const paid = Number(invoice.amountPaid ?? 0);
  if (Number.isFinite(paid) && paid > 0) return paid;
  return 0;
}
