import type { CasualSwimBillDto } from "@/lib/casual-swim-bill";
import { buildCasualSwimReceiptBreakdown } from "@/lib/casual-swim-receipt-format";
import { getCasualSwimReceiptPaymentLines } from "@/lib/casual-swim-payment";

/** Thermal receipt width (screen, print, and PDF). */
export const CASUAL_SWIM_RECEIPT_WIDTH_MM = 80;

/** Millimetres → PDF points (1 mm ≈ 2.83465 pt). */
export function mmToPt(mm: number): number {
  return mm * 2.83465;
}

export const CASUAL_SWIM_RECEIPT_PDF_WIDTH_MM = CASUAL_SWIM_RECEIPT_WIDTH_MM;
export const CASUAL_SWIM_RECEIPT_PDF_WIDTH_PT = mmToPt(CASUAL_SWIM_RECEIPT_WIDTH_MM);

const PAGE_PADDING_PT = 14;
const LOGO_BLOCK_PT = 54;
const LINE_PT = 10;
const DIVIDER_PT = 5;
const TOTAL_BLOCK_PT = 22;
const FOOTER_BLOCK_PT = 28;
const HEIGHT_BUFFER_PT = 6;

/**
 * Tight single-page height estimate for @react-pdf/renderer thermal receipts.
 * Slightly padded so content never spills onto a second page.
 */
export function estimateCasualSwimReceiptPdfHeightPt(bill: CasualSwimBillDto): number {
  const { swimmingLines, rentalLines } = buildCasualSwimReceiptBreakdown(bill);
  const paymentLines = getCasualSwimReceiptPaymentLines(bill).lines;

  let lines = 1 + 3; // ticket number + date/time/cashier
  lines += 1 + paymentLines.length; // payment mode + paid lines
  if (swimmingLines.length > 0) {
    lines += 1 + swimmingLines.length + 1;
  }
  if (rentalLines.length > 0) {
    lines += 1 + rentalLines.length + 1;
  }

  const dividers =
    2 + // header + pre-total
    (swimmingLines.length > 0 ? 1 : 0) +
    (rentalLines.length > 0 ? 1 : 0) +
    1; // post-total before footer

  const height =
    PAGE_PADDING_PT +
    LOGO_BLOCK_PT +
    lines * LINE_PT +
    dividers * DIVIDER_PT +
    TOTAL_BLOCK_PT +
    FOOTER_BLOCK_PT +
    HEIGHT_BUFFER_PT;

  return Math.ceil(height);
}
