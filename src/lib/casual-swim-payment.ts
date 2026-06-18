import type { RevenuePaymentMode } from "@prisma/client";

/** Casual swim ticket payment modes — extend with schema enum + this list. */
export const CASUAL_SWIM_PAYMENT_MODES = ["CASH", "UPI", "PARTIAL"] as const satisfies readonly RevenuePaymentMode[];

export type CasualSwimPaymentMode = (typeof CASUAL_SWIM_PAYMENT_MODES)[number];

export const PARTIAL_PAYMENT_MISMATCH_MESSAGE =
  "Cash Amount and UPI Amount must equal the total bill amount.";

export const CASH_UPI_SPLIT_LABEL = "Cash + UPI";

export function casualSwimPaymentModeLabel(mode: RevenuePaymentMode | string): string {
  if (mode === "UPI") return "UPI";
  if (mode === "PARTIAL") return CASH_UPI_SPLIT_LABEL;
  return "Cash";
}

export function receiptPaymentModeDisplay(mode: RevenuePaymentMode | string): string {
  if (mode === "PARTIAL") return CASH_UPI_SPLIT_LABEL;
  return mode === "UPI" ? "UPI" : "Cash";
}

export type CasualSwimPaymentLine = {
  label: string;
  amount: number;
};

export function getCasualSwimReceiptPaymentLines(bill: {
  paymentMode: RevenuePaymentMode;
  cashAmount: number;
  upiAmount: number;
  totalAmount: number;
}): { mode: string; lines: CasualSwimPaymentLine[] } {
  const mode = receiptPaymentModeDisplay(bill.paymentMode);

  if (bill.paymentMode === "PARTIAL") {
    return {
      mode,
      lines: [
        { label: "Cash Paid", amount: bill.cashAmount },
        { label: "UPI Paid", amount: bill.upiAmount },
      ],
    };
  }

  if (bill.paymentMode === "UPI") {
    return {
      mode,
      lines: [{ label: "UPI Paid", amount: bill.upiAmount }],
    };
  }

  return {
    mode,
    lines: [{ label: "Cash Paid", amount: bill.cashAmount }],
  };
}

export type ResolveCasualSwimPaymentInput = {
  paymentMode: CasualSwimPaymentMode;
  cashAmount?: number;
  upiAmount?: number;
};

export type ResolvedCasualSwimPayment = {
  paymentMode: CasualSwimPaymentMode;
  cashAmount: number;
  upiAmount: number;
};

export function resolveCasualSwimPayment(
  input: ResolveCasualSwimPaymentInput,
  totalAmount: number
): { ok: true; payment: ResolvedCasualSwimPayment } | { ok: false; message: string } {
  if (totalAmount <= 0) {
    return { ok: false, message: "Total amount must be greater than zero" };
  }

  if (input.paymentMode === "CASH") {
    return {
      ok: true,
      payment: { paymentMode: "CASH", cashAmount: totalAmount, upiAmount: 0 },
    };
  }

  if (input.paymentMode === "UPI") {
    return {
      ok: true,
      payment: { paymentMode: "UPI", cashAmount: 0, upiAmount: totalAmount },
    };
  }

  const cashAmount = input.cashAmount ?? 0;
  const upiAmount = input.upiAmount ?? 0;

  if (Math.abs(cashAmount + upiAmount - totalAmount) > 0.009) {
    return { ok: false, message: PARTIAL_PAYMENT_MISMATCH_MESSAGE };
  }

  if (cashAmount <= 0 || upiAmount <= 0) {
    return {
      ok: false,
      message: "Cash + UPI payment requires both cash and UPI amounts greater than zero.",
    };
  }

  return {
    ok: true,
    payment: { paymentMode: "PARTIAL", cashAmount, upiAmount },
  };
}

/** Backfill amounts for legacy rows missing explicit split columns. */
export function normalizeCasualSwimPaymentAmounts(row: {
  paymentMode: RevenuePaymentMode;
  totalAmount: number;
  cashAmount?: number;
  upiAmount?: number;
}): { cashAmount: number; upiAmount: number } {
  if (row.cashAmount != null && row.upiAmount != null) {
    return { cashAmount: row.cashAmount, upiAmount: row.upiAmount };
  }
  if (row.paymentMode === "UPI") {
    return { cashAmount: 0, upiAmount: row.totalAmount };
  }
  return { cashAmount: row.totalAmount, upiAmount: 0 };
}
