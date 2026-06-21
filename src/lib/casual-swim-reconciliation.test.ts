import { describe, expect, it } from "vitest";
import {
  applyCasualSwimReconciliationToTotals,
  computeComplementAmount,
  validateCasualSwimReconciliation,
} from "@/lib/casual-swim-reconciliation";

describe("validateCasualSwimReconciliation", () => {
  it("accepts a valid cash and UPI split", () => {
    const result = validateCasualSwimReconciliation({
      totalRevenue: 4500,
      cashAmount: 3000,
      upiAmount: 1500,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects when amounts exceed total", () => {
    const result = validateCasualSwimReconciliation({
      totalRevenue: 2000,
      cashAmount: 1500,
      upiAmount: 1500,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects when sum does not match total", () => {
    const result = validateCasualSwimReconciliation({
      totalRevenue: 4500,
      cashAmount: 3000,
      upiAmount: 1000,
    });
    expect(result.ok).toBe(false);
  });
});

describe("computeComplementAmount", () => {
  it("computes remaining cash from UPI entry", () => {
    expect(computeComplementAmount(4500, 1500)).toBe(3000);
  });
});

describe("applyCasualSwimReconciliationToTotals", () => {
  const baseBreakdown = {
    cash: 5000,
    upi: 3000,
    card: 0,
    other: 0,
    grossCollected: 8000,
    cashExpenses: 200,
    upiExpenses: 0,
    netCash: 4800,
    netUpi: 3000,
  };

  it("leaves totals unchanged when not reconciled", () => {
    const result = applyCasualSwimReconciliationToTotals({
      invoiceRevenue: 8000,
      totalExpenses: 200,
      paymentBreakdown: baseBreakdown,
      casualSwimRevenue: 4500,
      reconciliation: {
        reconciled: false,
        stale: false,
        cashAmount: 0,
        upiAmount: 0,
        casualSwimTotal: 0,
        reconciledAt: null,
        reconciledByName: null,
        reconciledBy: null,
      },
    });

    expect(result.totalRevenue).toBe(8000);
    expect(result.paymentBreakdown.cash).toBe(5000);
    expect(result.paymentBreakdown.upi).toBe(3000);
  });

  it("adds reconciled casual swim to cash, UPI, and revenue", () => {
    const result = applyCasualSwimReconciliationToTotals({
      invoiceRevenue: 8000,
      totalExpenses: 200,
      paymentBreakdown: baseBreakdown,
      casualSwimRevenue: 4500,
      reconciliation: {
        reconciled: true,
        stale: false,
        cashAmount: 3000,
        upiAmount: 1500,
        casualSwimTotal: 4500,
        reconciledAt: "2026-06-30T12:00:00.000Z",
        reconciledByName: "Admin",
        reconciledBy: { id: "u1", name: "Admin", username: "admin" },
      },
    });

    expect(result.totalRevenue).toBe(12500);
    expect(result.paymentBreakdown.cash).toBe(8000);
    expect(result.paymentBreakdown.upi).toBe(4500);
    expect(result.netCollection).toBe(12300);
  });
});
