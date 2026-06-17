import type { CasualSwimBillDto } from "@/lib/casual-swim-bill";
import { formatCurrency } from "@/lib/utils";

/** Thermal receipt width — 58mm suits common POS printers; scales on screen. */
export const CASUAL_SWIM_RECEIPT_WIDTH_MM = 58;

export function formatTicketNumberDisplay(ticketNumber: number): string {
  return `TICKET #${String(ticketNumber).padStart(3, "0")}`;
}

export function formatReceiptTimestamp(date: Date) {
  return {
    date: new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date),
  };
}

export type ReceiptLineItem = {
  label: string;
  amount: number;
};

function swimmingLine(
  label: string,
  count: number,
  ratePerHour: number,
  hours: number
): ReceiptLineItem | null {
  if (count <= 0) return null;
  const amount = count * ratePerHour * hours;
  const ratePart = formatCurrency(ratePerHour);
  const hoursPart = hours === 1 ? "" : ` × ${hours}h`;
  return {
    label: `${label} ${count} × ${ratePart}${hoursPart}`,
    amount,
  };
}

function rentalLine(
  label: string,
  qty: number,
  unitPrice: number
): ReceiptLineItem | null {
  if (qty <= 0) return null;
  return {
    label: `${label} ${qty} × ${formatCurrency(unitPrice)}`,
    amount: qty * unitPrice,
  };
}

export function buildCasualSwimReceiptBreakdown(bill: CasualSwimBillDto) {
  const swimmingLines = [
    swimmingLine("Adults", bill.adultCount, bill.adultRate, bill.hours),
    swimmingLine("Children", bill.childCount, bill.childRate, bill.hours),
  ].filter((line): line is ReceiptLineItem => line !== null);

  const rentalLines = [
    rentalLine("Caps", bill.capQty, bill.capRate),
    rentalLine("Shorts", bill.shortsQty, bill.shortsRate),
    rentalLine("Goggles", bill.gogglesQty, bill.gogglesRate),
  ].filter((line): line is ReceiptLineItem => line !== null);

  return { swimmingLines, rentalLines };
}

export function formatReceiptLineItem(line: ReceiptLineItem): string {
  return `${line.label} = ${formatCurrency(line.amount)}`;
}
