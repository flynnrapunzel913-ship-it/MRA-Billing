"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import {
  DENOMINATION_CONFIG,
  calculateCashDifference,
  calculatePhysicalCash,
  denominationLineItems,
  emptyDenominations,
  formatCashDifference,
  normalizeDenominations,
  type CashDenominations,
} from "@/lib/cash-denominations";
import type { CashReconciliation } from "@/lib/daily-collection";

const glassCard = cn("glass-panel overflow-hidden");

type CashDenominationSectionProps = {
  systemCash: number;
  denominations: CashDenominations;
  onDenominationsChange: (next: CashDenominations) => void;
  denominationsLocked?: boolean;
  storedReconciliation?: CashReconciliation | null;
};

export function CashDenominationSection({
  systemCash,
  denominations,
  onDenominationsChange,
  denominationsLocked = false,
  storedReconciliation,
}: CashDenominationSectionProps) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const activeDenominations =
    denominationsLocked && storedReconciliation
      ? storedReconciliation.cashDenominations
      : denominations;

  const physicalCash = useMemo(
    () =>
      denominationsLocked && storedReconciliation
        ? storedReconciliation.cashCountedPhysical
        : calculatePhysicalCash(denominations),
    [denominations, denominationsLocked, storedReconciliation]
  );

  const systemAmount =
    denominationsLocked && storedReconciliation
      ? storedReconciliation.cashCollectedSystem
      : systemCash;

  const difference =
    denominationsLocked && storedReconciliation
      ? storedReconciliation.cashDifference
      : calculateCashDifference(physicalCash, systemAmount);

  const diffStatus = formatCashDifference(difference);
  const lineItems = denominationLineItems(activeDenominations);

  const updateQuantity = (key: string, raw: string) => {
    const qty = raw === "" ? 0 : Math.max(0, Math.floor(Number(raw) || 0));
    onDenominationsChange({ ...denominations, [key]: qty });
  };

  return (
    <Card className={glassCard}>
      <CardHeader className="border-b border-border px-5 py-4">
        <CardTitle className="text-base">Physical Cash Verification</CardTitle>
        <p className="text-sm text-muted-foreground">
          Count physical cash by denomination and reconcile with system cash collection
        </p>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        {!denominationsLocked && (
          <div className="grid gap-3 sm:grid-cols-2">
            {DENOMINATION_CONFIG.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-2"
              >
                <span className="text-sm font-medium">{row.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">×</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    className="h-9 w-20 text-right tabular-nums"
                    value={denominations[row.key] === 0 ? "" : denominations[row.key]}
                    onChange={(e) => updateQuantity(row.key, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-4">
          <p className="text-sm font-semibold">Physical Cash Counted</p>
          {lineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No denominations entered.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {lineItems.map((row) => (
                <li key={row.key} className="flex justify-between gap-4">
                  <span>
                    {row.label} × {row.quantity}
                  </span>
                  <span className="font-medium tabular-nums">= {formatCurrency(row.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-between border-t border-border/60 pt-2 font-semibold">
            <span>Total Physical Cash</span>
            <span className="tabular-nums">{formatCurrency(physicalCash)}</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm text-muted-foreground">System Cash Collection</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(systemAmount)}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm text-muted-foreground">Physical Cash Counted</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(physicalCash)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Difference</p>
            <p
              className={cn(
                "text-lg font-bold tabular-nums",
                diffStatus.reconciled ? "text-emerald-600" : "text-destructive"
              )}
            >
              {diffStatus.label}
            </p>
          </div>
          {diffStatus.reconciled ? (
            <Badge variant="success">Cash Reconciled ✓</Badge>
          ) : (
            <Badge variant="destructive">Cash Mismatch ⚠</Badge>
          )}
        </div>

        {denominationsLocked && storedReconciliation && lineItems.length > 0 && (
          <div className="rounded-lg border border-border/60">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
              onClick={() => setBreakdownOpen((open) => !open)}
            >
              Denomination Breakdown
              {breakdownOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {breakdownOpen && (
              <div className="border-t border-border/60 px-4 py-3">
                <ul className="space-y-1 text-sm">
                  {lineItems.map((row) => (
                    <li key={row.key} className="flex justify-between">
                      <span>
                        {row.label} × {row.quantity}
                      </span>
                      <span className="tabular-nums">{formatCurrency(row.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function emptyCashState() {
  return emptyDenominations();
}

export function cashStateFromReconciliation(reconciliation: CashReconciliation | null | undefined) {
  if (!reconciliation) return emptyCashState();
  return normalizeDenominations(reconciliation.cashDenominations);
}
