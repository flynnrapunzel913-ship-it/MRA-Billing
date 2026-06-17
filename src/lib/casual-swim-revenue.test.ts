import { describe, expect, it } from "vitest";
import { sumCasualSwimRevenueByPaymentMode } from "@/lib/casual-swim-revenue";
import { computeCollectionTotals } from "@/lib/daily-collection";

describe("sumCasualSwimRevenueByPaymentMode", () => {
  it("sums cash and UPI casual swim tickets separately", () => {
    const totals = sumCasualSwimRevenueByPaymentMode([
      { totalAmount: 700, paymentMode: "CASH" },
      { totalAmount: 300, paymentMode: "UPI" },
      { totalAmount: 200, paymentMode: "CASH" },
    ]);

    expect(totals.cash).toBe(900);
    expect(totals.upi).toBe(300);
    expect(totals.total).toBe(1200);
    expect(totals.ticketCount).toBe(3);
  });

  it("uses explicit cash and UPI amounts for partial tickets", () => {
    const totals = sumCasualSwimRevenueByPaymentMode([
      { totalAmount: 500, paymentMode: "CASH", cashAmount: 500, upiAmount: 0 },
      { totalAmount: 400, paymentMode: "UPI", cashAmount: 0, upiAmount: 400 },
      {
        totalAmount: 500,
        paymentMode: "PARTIAL",
        cashAmount: 300,
        upiAmount: 200,
      },
    ]);

    expect(totals.cash).toBe(800);
    expect(totals.upi).toBe(600);
    expect(totals.total).toBe(1400);
    expect(totals.ticketCount).toBe(3);
  });
});

describe("computeCollectionTotals with casual swim", () => {
  it("includes casual swim in total revenue and payment breakdown", () => {
    const result = computeCollectionTotals({
      subscriptionRevenue: 5000,
      productRevenue: 0,
      casualSwimRevenue: 1200,
      grossCash: 2700,
      grossUpi: 1800,
      grossCard: 0,
      grossOther: 0,
      cashExpenses: 500,
      upiExpenses: 0,
    });

    expect(result.totalRevenue).toBe(4500);
    expect(result.netCollection).toBe(4000);
    expect(result.paymentBreakdown.cash).toBe(2700);
    expect(result.paymentBreakdown.upi).toBe(1800);
  });
});
