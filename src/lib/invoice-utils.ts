import { numberToIndianWords } from "./number-to-words";
import type { PaymentStatusType } from "./constants";

export interface InvoiceLineItem {
  itemType: string;
  description: string;
  quantity: number;
  unitPrice: number;
  packageStartDate?: string;
  packageEndDate?: string;
  subscriptionPricingId?: string;
  sectionSnapshot?: string;
  labelSnapshot?: string;
  priceSnapshot?: number;
}

export interface GstOptions {
  gstEnabled?: boolean;
  cgstRate?: number;
  sgstRate?: number;
}

export interface InvoiceTotals {
  subtotal: number;
  gstEnabled: boolean;
  cgstRate: number;
  sgstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  totalGst: number;
  grandTotal: number;
  amountInWords: string;
}

export interface PaymentAmounts {
  amountPaid: number;
  amountRemaining: number;
}

export function calculateInvoiceTotals(
  items: InvoiceLineItem[],
  options: GstOptions = {}
): InvoiceTotals {
  const gstEnabled = options.gstEnabled ?? true;
  const cgstRate = gstEnabled ? (options.cgstRate ?? 9) : 0;
  const sgstRate = gstEnabled ? (options.sgstRate ?? 9) : 0;

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const cgstAmount = gstEnabled ? (subtotal * cgstRate) / 100 : 0;
  const sgstAmount = gstEnabled ? (subtotal * sgstRate) / 100 : 0;
  const totalGst = cgstAmount + sgstAmount;
  const grandTotal = subtotal + totalGst;

  return {
    subtotal: round2(subtotal),
    gstEnabled,
    cgstRate,
    sgstRate,
    cgstAmount: round2(cgstAmount),
    sgstAmount: round2(sgstAmount),
    totalGst: round2(totalGst),
    grandTotal: round2(grandTotal),
    amountInWords: numberToIndianWords(grandTotal),
  };
}

export function calculatePaymentAmounts(
  grandTotal: number,
  paymentStatus: PaymentStatusType,
  amountPaidInput?: number
): PaymentAmounts {
  if (paymentStatus === "FULLY_PAID") {
    return { amountPaid: round2(grandTotal), amountRemaining: 0 };
  }

  if (paymentStatus === "PENDING") {
    return { amountPaid: 0, amountRemaining: round2(grandTotal) };
  }

  const amountPaid = round2(amountPaidInput ?? 0);
  if (amountPaid > grandTotal) {
    throw new Error("Amount paid cannot exceed grand total");
  }

  return {
    amountPaid,
    amountRemaining: round2(grandTotal - amountPaid),
  };
}

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatInvoiceNumber(year: number, sequence: number) {
  return `MRA-${year}-${String(sequence).padStart(5, "0")}`;
}

export function lineTotal(item: InvoiceLineItem) {
  return round2(item.quantity * item.unitPrice);
}
