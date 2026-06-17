import { describe, expect, it } from "vitest";
import type { CasualSwimBillDto } from "@/lib/casual-swim-bill";
import {
  CASUAL_SWIM_RECEIPT_PDF_WIDTH_MM,
  CASUAL_SWIM_RECEIPT_PDF_WIDTH_PT,
  estimateCasualSwimReceiptPdfHeightPt,
  mmToPt,
} from "@/lib/casual-swim-receipt-pdf-size";

const sampleBill: CasualSwimBillDto = {
  id: "bill_1",
  ticketNumber: 1,
  hours: 1,
  adultCount: 1,
  childCount: 1,
  capQty: 2,
  shortsQty: 2,
  gogglesQty: 1,
  adultRate: 150,
  childRate: 100,
  capRate: 150,
  shortsRate: 200,
  gogglesRate: 150,
  swimmingAmount: 250,
  rentalAmount: 850,
  totalAmount: 1100,
  status: "ACTIVE",
  createdAt: "2026-06-17T11:04:00.000Z",
  createdBy: "Sanjana",
  createdByUsername: "sanjana",
  createdById: "user_1",
};

describe("casual swim receipt PDF size", () => {
  it("uses 80mm thermal width", () => {
    expect(CASUAL_SWIM_RECEIPT_PDF_WIDTH_MM).toBe(80);
    expect(CASUAL_SWIM_RECEIPT_PDF_WIDTH_PT).toBeCloseTo(mmToPt(80), 1);
  });

  it("estimates a compact single-page height from content", () => {
    const height = estimateCasualSwimReceiptPdfHeightPt(sampleBill);
    expect(height).toBeGreaterThan(100);
    expect(height).toBeLessThan(mmToPt(200));
  });
});
