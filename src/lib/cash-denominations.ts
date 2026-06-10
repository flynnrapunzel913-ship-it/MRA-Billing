export const CASH_DENOMINATION_KEYS = [
  "2000",
  "500",
  "200",
  "100",
  "50",
  "20",
  "10",
  "5",
  "2",
  "1",
] as const;

export type CashDenominationKey = (typeof CASH_DENOMINATION_KEYS)[number];
export type CashDenominations = Record<string, number>;

export const DENOMINATION_CONFIG: Array<{
  key: CashDenominationKey;
  label: string;
  value: number;
  optional?: boolean;
}> = [
  { key: "2000", label: "₹2000", value: 2000, optional: true },
  { key: "500", label: "₹500", value: 500 },
  { key: "200", label: "₹200", value: 200 },
  { key: "100", label: "₹100", value: 100 },
  { key: "50", label: "₹50", value: 50 },
  { key: "20", label: "₹20", value: 20 },
  { key: "10", label: "₹10", value: 10 },
  { key: "5", label: "₹5 coin", value: 5, optional: true },
  { key: "2", label: "₹2 coin", value: 2, optional: true },
  { key: "1", label: "₹1 coin", value: 1, optional: true },
];

export function emptyDenominations(): CashDenominations {
  return Object.fromEntries(CASH_DENOMINATION_KEYS.map((key) => [key, 0]));
}

export function normalizeDenominations(input: unknown): CashDenominations {
  const base = emptyDenominations();
  if (!input || typeof input !== "object") return base;

  for (const key of CASH_DENOMINATION_KEYS) {
    const raw = (input as Record<string, unknown>)[key];
    const qty = Number(raw);
    base[key] = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 0;
  }
  return base;
}

export function calculatePhysicalCash(denominations: CashDenominations): number {
  return DENOMINATION_CONFIG.reduce((sum, row) => {
    const qty = denominations[row.key] ?? 0;
    return sum + row.value * qty;
  }, 0);
}

/** physical − system (negative = short, positive = excess) */
export function calculateCashDifference(physical: number, system: number): number {
  return Math.round((physical - system) * 100) / 100;
}

export function formatCashDifference(difference: number): {
  label: string;
  reconciled: boolean;
} {
  if (difference === 0) {
    return { label: "Cash Reconciled ✓", reconciled: true };
  }
  const abs = Math.abs(difference);
  if (difference < 0) {
    return { label: `₹${abs.toLocaleString("en-IN")} Short`, reconciled: false };
  }
  return { label: `₹${abs.toLocaleString("en-IN")} Excess`, reconciled: false };
}

export function denominationLineItems(denominations: CashDenominations) {
  return DENOMINATION_CONFIG.map((row) => {
    const quantity = denominations[row.key] ?? 0;
    const amount = row.value * quantity;
    return { ...row, quantity, amount };
  }).filter((row) => row.quantity > 0);
}
