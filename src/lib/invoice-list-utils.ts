export const RECENT_INVOICE_COUNT = 10;

export type InvoiceListRow = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  grandTotal: string | number;
  paymentStatus: string;
};

export function sortInvoicesNewestFirst<T extends { invoiceDate: string }>(invoices: T[]): T[] {
  return [...invoices].sort(
    (a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
  );
}

export function splitInvoicesByRecency<T extends { invoiceDate: string }>(invoices: T[]) {
  const sorted = sortInvoicesNewestFirst(invoices);
  return {
    recent: sorted.slice(0, RECENT_INVOICE_COUNT),
    history: sorted.slice(RECENT_INVOICE_COUNT),
    total: sorted.length,
  };
}

export function groupInvoicesByMonth<T extends { invoiceDate: string }>(
  invoices: T[]
): Array<{ monthKey: string; monthLabel: string; invoices: T[] }> {
  const sorted = sortInvoicesNewestFirst(invoices);
  const groups = new Map<string, T[]>();

  for (const invoice of sorted) {
    const date = new Date(invoice.invoiceDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existing = groups.get(monthKey);
    if (existing) {
      existing.push(invoice);
    } else {
      groups.set(monthKey, [invoice]);
    }
  }

  return Array.from(groups.entries()).map(([monthKey, items]) => ({
    monthKey,
    monthLabel: new Intl.DateTimeFormat("en-IN", {
      month: "long",
      year: "numeric",
    }).format(new Date(items[0]!.invoiceDate)),
    invoices: items,
  }));
}
