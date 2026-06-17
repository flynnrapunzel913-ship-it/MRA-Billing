import { describe, expect, it } from "vitest";
import type { CasualSwimBillDto } from "@/lib/casual-swim-bill";
import {
  buildCasualSwimReceiptBreakdown,
  formatReceiptLineItem,
  formatTicketNumberDisplay,
} from "@/lib/casual-swim-receipt-format";

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
  paymentMode: "CASH",
  cashAmount: 1100,
  upiAmount: 0,
  status: "COMPLETED",
  createdAt: "2026-06-17T11:04:00.000Z",
  createdBy: "Sanjana",
  createdByUsername: "sanjana",
  createdById: "user_1",
};

describe("casual swim receipt format", () => {
  it("pads ticket numbers for display", () => {
    expect(formatTicketNumberDisplay(1)).toBe("TICKET #001");
    expect(formatTicketNumberDisplay(42)).toBe("TICKET #042");
  });

  it("builds auditable line-item breakdown", () => {
    const { swimmingLines, rentalLines } = buildCasualSwimReceiptBreakdown(sampleBill);
    expect(swimmingLines).toHaveLength(2);
    expect(rentalLines).toHaveLength(3);
    expect(formatReceiptLineItem(swimmingLines[0])).toContain("Adults 1");
    expect(formatReceiptLineItem(rentalLines[0])).toContain("Caps 2");
  });
});
