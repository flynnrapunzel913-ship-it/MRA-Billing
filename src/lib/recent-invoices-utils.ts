import {
  formatInvoiceItems,
  groupInvoicesByDate,
  type InvoiceListItem,
} from "@/lib/invoice-list-utils";

export type RecentInvoiceItem = InvoiceListItem;

export type RecentInvoiceRow = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  paymentStatus: string;
  grandTotal?: string | number;
  items?: RecentInvoiceItem[];
  createdById?: string;
};

export { groupInvoicesByDate, formatInvoiceItems };
