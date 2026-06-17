import { toJsonNumber } from "@/lib/serialize-prisma";
import { normalizeCasualSwimPaymentAmounts } from "@/lib/casual-swim-payment";
import type { RevenuePaymentMode } from "@prisma/client";

export type CasualSwimRevenueTotals = {
  total: number;
  cash: number;
  upi: number;
  ticketCount: number;
};

export function sumCasualSwimRevenueByPaymentMode(
  bills: Array<{
    totalAmount: unknown;
    paymentMode: RevenuePaymentMode;
    cashAmount?: unknown;
    upiAmount?: unknown;
  }>
): CasualSwimRevenueTotals {
  let cash = 0;
  let upi = 0;

  for (const bill of bills) {
    const total = toJsonNumber(bill.totalAmount);
    const { cashAmount, upiAmount } = normalizeCasualSwimPaymentAmounts({
      paymentMode: bill.paymentMode,
      totalAmount: total,
      cashAmount: bill.cashAmount != null ? toJsonNumber(bill.cashAmount) : undefined,
      upiAmount: bill.upiAmount != null ? toJsonNumber(bill.upiAmount) : undefined,
    });
    cash += cashAmount;
    upi += upiAmount;
  }

  return {
    cash,
    upi,
    total: cash + upi,
    ticketCount: bills.length,
  };
}
