export type InvoiceSearchRow = {
  id: string;
  invoiceNumber: string;
  customerName: string;
};

export function filterInvoicesByQuery<T extends InvoiceSearchRow>(
  invoices: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return invoices;
  return invoices.filter(
    (invoice) =>
      invoice.invoiceNumber.toLowerCase().includes(q) ||
      invoice.customerName.toLowerCase().includes(q)
  );
}
