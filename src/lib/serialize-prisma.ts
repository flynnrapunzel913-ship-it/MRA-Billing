/** Coerce Prisma Decimal / numeric fields for JSON responses */
export function toJsonNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

type InvoiceItemLike = {
  unitPrice: unknown;
  amount: unknown;
  [key: string]: unknown;
};

type InvoiceLike = {
  subtotal: unknown;
  cgstRate: unknown;
  sgstRate: unknown;
  cgstAmount: unknown;
  sgstAmount: unknown;
  totalGst: unknown;
  grandTotal: unknown;
  amountPaid: unknown;
  amountRemaining: unknown;
  items?: InvoiceItemLike[];
  [key: string]: unknown;
};

export function serializeInvoiceForJson<T extends InvoiceLike>(invoice: T) {
  return {
    ...invoice,
    subtotal: toJsonNumber(invoice.subtotal),
    cgstRate: toJsonNumber(invoice.cgstRate),
    sgstRate: toJsonNumber(invoice.sgstRate),
    cgstAmount: toJsonNumber(invoice.cgstAmount),
    sgstAmount: toJsonNumber(invoice.sgstAmount),
    totalGst: toJsonNumber(invoice.totalGst),
    grandTotal: toJsonNumber(invoice.grandTotal),
    amountPaid: toJsonNumber(invoice.amountPaid),
    amountRemaining: toJsonNumber(invoice.amountRemaining),
    items: invoice.items?.map((item) => ({
      ...item,
      unitPrice: toJsonNumber(item.unitPrice),
      amount: toJsonNumber(item.amount),
    })),
  };
}
