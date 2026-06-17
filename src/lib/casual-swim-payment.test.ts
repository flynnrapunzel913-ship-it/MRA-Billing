import { describe, expect, it } from "vitest";
import {
  getCasualSwimReceiptPaymentLines,
  normalizeCasualSwimPaymentAmounts,
  PARTIAL_PAYMENT_MISMATCH_MESSAGE,
  resolveCasualSwimPayment,
} from "@/lib/casual-swim-payment";

describe("resolveCasualSwimPayment", () => {
  it("maps cash mode to full cash amount", () => {
    const result = resolveCasualSwimPayment({ paymentMode: "CASH" }, 1000);
    expect(result).toEqual({
      ok: true,
      payment: { paymentMode: "CASH", cashAmount: 1000, upiAmount: 0 },
    });
  });

  it("maps UPI mode to full UPI amount", () => {
    const result = resolveCasualSwimPayment({ paymentMode: "UPI" }, 1000);
    expect(result).toEqual({
      ok: true,
      payment: { paymentMode: "UPI", cashAmount: 0, upiAmount: 1000 },
    });
  });

  it("accepts valid partial split", () => {
    const result = resolveCasualSwimPayment(
      { paymentMode: "PARTIAL", cashAmount: 800, upiAmount: 200 },
      1000
    );
    expect(result).toEqual({
      ok: true,
      payment: { paymentMode: "PARTIAL", cashAmount: 800, upiAmount: 200 },
    });
  });

  it("rejects partial split that does not match total", () => {
    const result = resolveCasualSwimPayment(
      { paymentMode: "PARTIAL", cashAmount: 700, upiAmount: 200 },
      1000
    );
    expect(result).toEqual({ ok: false, message: PARTIAL_PAYMENT_MISMATCH_MESSAGE });
  });
});

describe("normalizeCasualSwimPaymentAmounts", () => {
  it("backfills legacy cash tickets", () => {
    expect(
      normalizeCasualSwimPaymentAmounts({ paymentMode: "CASH", totalAmount: 500 })
    ).toEqual({ cashAmount: 500, upiAmount: 0 });
  });

  it("backfills legacy UPI tickets", () => {
    expect(
      normalizeCasualSwimPaymentAmounts({ paymentMode: "UPI", totalAmount: 400 })
    ).toEqual({ cashAmount: 0, upiAmount: 400 });
  });

  it("uses explicit amounts when present", () => {
    expect(
      normalizeCasualSwimPaymentAmounts({
        paymentMode: "PARTIAL",
        totalAmount: 1000,
        cashAmount: 300,
        upiAmount: 200,
      })
    ).toEqual({ cashAmount: 300, upiAmount: 200 });
  });
});

describe("getCasualSwimReceiptPaymentLines", () => {
  it("shows cash and UPI paid lines for partial tickets", () => {
    const lines = getCasualSwimReceiptPaymentLines({
      paymentMode: "PARTIAL",
      cashAmount: 800,
      upiAmount: 200,
      totalAmount: 1000,
    });
    expect(lines.mode).toBe("PARTIAL");
    expect(lines.lines).toEqual([
      { label: "Cash Paid", amount: 800 },
      { label: "UPI Paid", amount: 200 },
    ]);
  });
});
