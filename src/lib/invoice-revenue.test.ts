import { describe, expect, it } from "vitest";
import { getCollectedInvoiceWhere, invoiceCollectedAmount } from "@/lib/invoice-revenue";

describe("invoiceCollectedAmount", () => {
  it("uses amountPaid when positive", () => {
    expect(invoiceCollectedAmount({ amountPaid: 1500, grandTotal: 2000 })).toBe(1500);
  });

  it("returns zero when nothing paid", () => {
    expect(invoiceCollectedAmount({ amountPaid: 0, grandTotal: 2000 })).toBe(0);
  });
});

describe("getCollectedInvoiceWhere", () => {
  it("filters to paid invoices with amount received", () => {
    const where = getCollectedInvoiceWhere({ deletedAt: null });
    expect(where.paymentStatus).toEqual({ in: ["FULLY_PAID", "PARTIALLY_PAID"] });
    expect(where.amountPaid).toEqual({ gt: 0 });
    expect(where.deletedAt).toBeNull();
  });
});
