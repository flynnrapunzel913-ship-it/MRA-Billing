"use client";

import { TrendingUp, Wallet, CircleDollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";
import type { FinancialSummaryKpis } from "@/lib/dashboard-kpis";

const glassCard = cn("glass-panel transition-all duration-200");

const financialCards = [
  {
    key: "totalRevenue" as const,
    label: "Revenue",
    icon: TrendingUp,
    accent: "from-emerald-500/15 to-emerald-400/5",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    format: (value: number) => formatCurrency(value),
  },
  {
    key: "totalExpenses" as const,
    label: "Expenses",
    icon: Wallet,
    accent: "from-rose-500/15 to-rose-400/5",
    iconBg: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
    format: (value: number) => formatCurrency(value),
  },
  {
    key: "netProfit" as const,
    label: "Net Profit",
    icon: CircleDollarSign,
    accent: "from-[#0284C7]/15 to-[#38bdf8]/5",
    iconBg: "bg-[#0284C7]/15 text-[#0284C7]",
    format: (value: number) => formatCurrency(value),
  },
] as const;

export function FinancialSummaryCards({ data }: { data: FinancialSummaryKpis }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {financialCards.map((card) => {
        const Icon = card.icon;
        const value = data[card.key];
        return (
          <Card
            key={card.key}
            className={cn(
              glassCard,
              "group overflow-hidden border-primary/15 hover:-translate-y-0.5 hover:border-primary/30"
            )}
          >
            <CardContent className="relative p-5 sm:p-6">
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
                  card.accent
                )}
                aria-hidden
              />
              <div className="relative flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105",
                    card.iconBg
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground sm:text-sm">{card.label}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-2xl">
                    {card.format(value)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
