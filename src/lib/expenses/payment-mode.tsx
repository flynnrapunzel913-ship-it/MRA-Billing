"use client";

import { Badge } from "@/components/ui/badge";

export type ExpensePaymentModeValue = "CASH" | "UPI";

export const EXPENSE_PAYMENT_MODES = ["CASH", "UPI"] as const satisfies readonly ExpensePaymentModeValue[];

export function expensePaymentModeLabel(mode: ExpensePaymentModeValue | string): string {
  return mode === "UPI" ? "UPI" : "Cash";
}

export function ExpensePaymentModeBadge({ mode }: { mode: ExpensePaymentModeValue | string }) {
  const isUpi = mode === "UPI";
  return (
    <Badge variant={isUpi ? "default" : "secondary"} className="font-medium">
      {expensePaymentModeLabel(mode)}
    </Badge>
  );
}
