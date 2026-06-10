"use client";

import { useMemo, useState } from "react";
import { CircleDollarSign, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, cn } from "@/lib/utils";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import type { FinancialSummaryPeriod, FinancialSummaryResult } from "@/lib/financial-summary";

const glassCard = cn("glass-panel transition-all duration-200");

const PERIOD_OPTIONS: { id: FinancialSummaryPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
];

const kpiCards = [
  {
    key: "totalCollections" as const,
    label: "Total Collections",
    icon: TrendingUp,
    accent: "from-emerald-500/15 to-emerald-400/5",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  },
  {
    key: "totalExpenses" as const,
    label: "Total Expenses",
    icon: Wallet,
    accent: "from-rose-500/15 to-rose-400/5",
    iconBg: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
  },
  {
    key: "netAmount" as const,
    label: "Net Amount",
    icon: CircleDollarSign,
    accent: "from-[#0284C7]/15 to-[#38bdf8]/5",
    iconBg: "bg-[#0284C7]/15 text-[#0284C7]",
    highlight: true,
  },
] as const;

function BreakdownTable({
  title,
  rows,
  emptyMessage,
}: {
  title: string;
  rows: Array<{ name: string; amount: number }>;
  emptyMessage: string;
}) {
  return (
    <Card className={cn(glassCard, "overflow-hidden")}>
      <CardHeader className="border-b border-border px-5 py-4">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold">Source</TableHead>
                  <TableHead className="text-right font-semibold">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={`${row.name}-${index}`} className={cn(index % 2 === 1 && "bg-muted/20")}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrency(row.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminFinancialSummary() {
  const [period, setPeriod] = useState<FinancialSummaryPeriod>("today");

  const url = useMemo(() => `/api/admin/financial-summary?period=${period}`, [period]);

  const { data, isInitialLoading, isRefreshing, error, refetch } =
    useCachedFetch<FinancialSummaryResult>(url, {
      ttlMs: 30_000,
      refetchOnFocus: true,
    });

  const summary = data ?? {
    totalCollections: 0,
    totalExpenses: 0,
    netAmount: 0,
    revenueBreakdown: [],
    productBreakdown: [],
    subscriptionBreakdown: [],
    expenseBreakdown: [],
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Switch period to review collections and expenses
            {isRefreshing ? " · updating…" : ""}
          </p>
        </div>
        <div className="inline-flex rounded-full border border-border/60 bg-card/40 p-1">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setPeriod(option.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                period === option.id
                  ? "nav-pill-active"
                  : "text-foreground/80 hover:bg-muted/40"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <Card className={glassCard}>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            <p>{error}</p>
            <button
              type="button"
              className="mt-2 text-primary underline"
              onClick={() => void refetch()}
            >
              Retry
            </button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kpiCards.map((kpi) => {
              const Icon = kpi.icon;
              const value = summary[kpi.key];
              const isHighlight = "highlight" in kpi && kpi.highlight;
              return (
                <Card
                  key={kpi.key}
                  className={cn(
                    glassCard,
                    "group overflow-hidden border-primary/15 hover:-translate-y-0.5 hover:border-primary/30",
                    isHighlight && "ring-2 ring-primary/30"
                  )}
                >
                  <CardContent className="relative p-5 sm:p-6">
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
                        kpi.accent
                      )}
                      aria-hidden
                    />
                    <div className="relative flex items-center gap-4">
                      <div
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105",
                          kpi.iconBg
                        )}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                          {kpi.label}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-xl font-bold tabular-nums tracking-tight sm:text-2xl",
                            isHighlight ? "text-primary" : "text-foreground",
                            isInitialLoading && "animate-pulse"
                          )}
                        >
                          {formatCurrency(value)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownTable
              title="Revenue Sources Breakdown"
              rows={summary.revenueBreakdown}
              emptyMessage="No collections recorded for this period."
            />
            <BreakdownTable
              title="Expense Breakdown"
              rows={summary.expenseBreakdown}
              emptyMessage="No expenses recorded for this period."
            />
            <BreakdownTable
              title="Subscription / Service Breakdown"
              rows={summary.subscriptionBreakdown}
              emptyMessage="No coaching or subscription sales for this period."
            />
            <BreakdownTable
              title="Product Sales Breakdown"
              rows={summary.productBreakdown}
              emptyMessage="No product sales for this period."
            />
          </div>
        </>
      )}
    </section>
  );
}
