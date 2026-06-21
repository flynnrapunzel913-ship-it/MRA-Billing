import { toJsonNumber } from "@/lib/serialize-prisma";
import type { PaymentBreakdown } from "@/lib/daily-collection";

const AMOUNT_TOLERANCE = 0.005;

export type CasualSwimReconciliationRecord = {
  reconciled: boolean;
  stale: boolean;
  cashAmount: number;
  upiAmount: number;
  casualSwimTotal: number;
  reconciledAt: string | null;
  reconciledByName: string | null;
  reconciledBy: { id: string; name: string; username: string } | null;
};

export type ReconciliationRow = {
  cashAmount: unknown;
  upiAmount: unknown;
  casualSwimTotal: unknown;
  lastCouponAbove5?: number | null;
  lastCouponBelow5?: number | null;
  reconciledAt: Date;
  reconciledByName: string | null;
  reconciledBy: { id: string; name: string; username: string };
};

export function amountsEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < AMOUNT_TOLERANCE;
}

export function computeComplementAmount(total: number, entered: number): number {
  return Math.max(0, Math.round((total - entered) * 100) / 100);
}

export function validateCasualSwimReconciliation(input: {
  totalRevenue: number;
  cashAmount: number;
  upiAmount: number;
}): { ok: true } | { ok: false; message: string } {
  const { totalRevenue, cashAmount, upiAmount } = input;

  if (totalRevenue <= 0) {
    return { ok: false, message: "Casual swimming revenue must be greater than zero to reconcile." };
  }

  if (cashAmount < 0 || upiAmount < 0) {
    return { ok: false, message: "Cash and UPI amounts cannot be negative." };
  }

  if (cashAmount > totalRevenue + AMOUNT_TOLERANCE) {
    return { ok: false, message: "Cash amount cannot exceed total casual swimming revenue." };
  }

  if (upiAmount > totalRevenue + AMOUNT_TOLERANCE) {
    return { ok: false, message: "UPI amount cannot exceed total casual swimming revenue." };
  }

  if (!amountsEqual(cashAmount + upiAmount, totalRevenue)) {
    return {
      ok: false,
      message: "Cash and UPI must add up to total casual swimming revenue.",
    };
  }

  return { ok: true };
}

export function serializeReconciliationRecord(
  row: ReconciliationRow | null | undefined,
  currentCasualSwimRevenue: number
): CasualSwimReconciliationRecord {
  if (!row) {
    return {
      reconciled: false,
      stale: false,
      cashAmount: 0,
      upiAmount: 0,
      casualSwimTotal: 0,
      reconciledAt: null,
      reconciledByName: null,
      reconciledBy: null,
    };
  }

  const cashAmount = toJsonNumber(row.cashAmount);
  const upiAmount = toJsonNumber(row.upiAmount);
  const casualSwimTotal = toJsonNumber(row.casualSwimTotal);
  const stale = !amountsEqual(casualSwimTotal, currentCasualSwimRevenue);
  const validSplit = amountsEqual(cashAmount + upiAmount, currentCasualSwimRevenue);

  return {
    reconciled: !stale && validSplit,
    stale,
    cashAmount,
    upiAmount,
    casualSwimTotal,
    reconciledAt: row.reconciledAt.toISOString(),
    reconciledByName: row.reconciledByName,
    reconciledBy: row.reconciledBy,
  };
}

export function applyCasualSwimReconciliationToTotals(input: {
  invoiceRevenue: number;
  totalExpenses: number;
  paymentBreakdown: PaymentBreakdown;
  casualSwimRevenue: number;
  reconciliation: CasualSwimReconciliationRecord;
}): {
  totalRevenue: number;
  netCollection: number;
  paymentBreakdown: PaymentBreakdown;
} {
  const { invoiceRevenue, totalExpenses, paymentBreakdown, casualSwimRevenue, reconciliation } =
    input;

  if (!reconciliation.reconciled) {
    return {
      totalRevenue: invoiceRevenue,
      netCollection: invoiceRevenue - totalExpenses,
      paymentBreakdown,
    };
  }

  const cash = reconciliation.cashAmount;
  const upi = reconciliation.upiAmount;
  const totalRevenue = invoiceRevenue + casualSwimRevenue;

  return {
    totalRevenue,
    netCollection: totalRevenue - totalExpenses,
    paymentBreakdown: {
      ...paymentBreakdown,
      cash: paymentBreakdown.cash + cash,
      upi: paymentBreakdown.upi + upi,
      grossCollected: paymentBreakdown.grossCollected + cash + upi,
      netCash: paymentBreakdown.netCash + cash,
      netUpi: paymentBreakdown.netUpi + upi,
    },
  };
}
