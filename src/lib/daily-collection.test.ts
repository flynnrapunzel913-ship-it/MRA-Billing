import { describe, expect, it } from "vitest";
import {
  buildPaymentBreakdownFromSnapshot,
  computeCollectionTotals,
} from "@/lib/daily-collection";

describe("buildPaymentBreakdownFromSnapshot", () => {
  it("reconstructs gross cash and expense split from persisted net figures", () => {
    const breakdown = buildPaymentBreakdownFromSnapshot({
      totalRevenue: 3000,
      subscriptionRevenue: 2500,
      productRevenue: 500,
      totalExpenses: 500,
      cashCollected: 1800,
      upiCollected: 1000,
      netCollection: 2300,
    });

    expect(breakdown.netCash).toBe(1800);
    expect(breakdown.netUpi).toBe(500);
    expect(breakdown.upiExpenses).toBe(500);
    expect(breakdown.cashExpenses).toBe(0);
    expect(breakdown.cash).toBe(1800);
    expect(breakdown.cashExpenses + breakdown.upiExpenses).toBe(500);
    expect(breakdown.netCash + breakdown.netUpi).toBe(2300);
  });

  it("allocates remainder revenue to card when cash and UPI do not cover total", () => {
    const breakdown = buildPaymentBreakdownFromSnapshot({
      totalRevenue: 3000,
      subscriptionRevenue: 0,
      productRevenue: 0,
      totalExpenses: 200,
      cashCollected: 1800,
      upiCollected: 1000,
      netCollection: 2800,
    });

    expect(breakdown.cash).toBe(2000);
    expect(breakdown.card).toBe(0);
    expect(breakdown.grossCollected).toBe(3000);
  });
});

describe("computeCollectionTotals", () => {
  it("computes net collection as revenue minus expenses", () => {
    const result = computeCollectionTotals({
      subscriptionRevenue: 2500,
      productRevenue: 500,
      grossCash: 2000,
      grossUpi: 1000,
      grossCard: 0,
      grossOther: 0,
      cashExpenses: 200,
      upiExpenses: 0,
    });

    expect(result.totalRevenue).toBe(3000);
    expect(result.totalExpenses).toBe(200);
    expect(result.netCollection).toBe(2800);
    expect(result.paymentBreakdown.netCash).toBe(1800);
    expect(result.paymentBreakdown.netUpi).toBe(1000);
    expect(result.paymentBreakdown.netCash + result.paymentBreakdown.netUpi).toBe(2800);
  });

  it("deducts UPI expenses from UPI collected only", () => {
    const result = computeCollectionTotals({
      subscriptionRevenue: 0,
      productRevenue: 0,
      grossCash: 21740,
      grossUpi: 5900,
      grossCard: 0,
      grossOther: 0,
      cashExpenses: 3000,
      upiExpenses: 2000,
    });

    expect(result.totalExpenses).toBe(5000);
    expect(result.netCollection).toBe(22640);
    expect(result.paymentBreakdown.netCash).toBe(18740);
    expect(result.paymentBreakdown.netUpi).toBe(3900);
  });

  it("uses item revenue when no payment totals are recorded", () => {
    const result = computeCollectionTotals({
      subscriptionRevenue: 2500,
      productRevenue: 500,
      grossCash: 0,
      grossUpi: 0,
      grossCard: 0,
      grossOther: 0,
      cashExpenses: 200,
      upiExpenses: 0,
    });

    expect(result.totalRevenue).toBe(3000);
    expect(result.netCollection).toBe(2800);
  });

  it("includes card and other payments in gross revenue", () => {
    const result = computeCollectionTotals({
      subscriptionRevenue: 0,
      productRevenue: 0,
      grossCash: 1000,
      grossUpi: 500,
      grossCard: 1000,
      grossOther: 500,
      cashExpenses: 200,
      upiExpenses: 0,
    });

    expect(result.totalRevenue).toBe(3000);
    expect(result.netCollection).toBe(2800);
    expect(result.paymentBreakdown.grossCollected).toBe(3000);
  });
});
