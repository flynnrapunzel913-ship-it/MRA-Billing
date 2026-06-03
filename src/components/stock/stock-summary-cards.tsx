"use client";

import { Package, IndianRupee, CalendarDays, Boxes } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { KpiCardsSkeleton } from "@/components/ui/skeletons";

export interface StockSummary {
  totalEntries: number;
  totalPurchaseCost: number;
  monthPurchases: number;
  totalUnitsPurchased: number;
}

const allCards = [
  {
    key: "entries" as const,
    label: "Total Stock Entries",
    icon: Package,
    adminOnly: false,
    format: (s: StockSummary) => `${s.totalEntries.toLocaleString("en-IN")} Entries`,
    accent: "from-primary/15 to-primary/5",
    iconBg: "bg-primary/15 text-primary",
  },
  {
    key: "value" as const,
    label: "Total Purchase Cost",
    icon: IndianRupee,
    adminOnly: true,
    format: (s: StockSummary) => formatCurrency(s.totalPurchaseCost),
    accent: "from-[#0284C7]/15 to-[#38bdf8]/5",
    iconBg: "bg-[#0284C7]/15 text-[#0284C7]",
  },
  {
    key: "month" as const,
    label: "This Month Purchases",
    icon: CalendarDays,
    adminOnly: true,
    format: (s: StockSummary) => formatCurrency(s.monthPurchases),
    accent: "from-amber-500/15 to-amber-400/5",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    key: "units" as const,
    label: "Total Items Purchased",
    icon: Boxes,
    adminOnly: false,
    format: (s: StockSummary) =>
      `${s.totalUnitsPurchased.toLocaleString("en-IN")} Units`,
    accent: "from-[#00E5D4]/15 to-[#00C2FF]/5",
    iconBg: "bg-[#00E5D4]/15 text-[#0096a8] dark:text-[#00E5D4]",
  },
] as const;

export function StockSummaryCards({
  summary,
  loading,
  showFinancialMetrics = true,
}: {
  summary: StockSummary | null;
  loading?: boolean;
  /** When false (receptionist), hides purchase-cost summary cards */
  showFinancialMetrics?: boolean;
}) {
  const cards = allCards.filter((c) => showFinancialMetrics || !c.adminOnly);

  if (loading) {
    return <KpiCardsSkeleton count={cards.length} />;
  }

  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2",
        cards.length > 2 ? "xl:grid-cols-4" : "lg:max-w-2xl"
      )}
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className={cn("glass-panel overflow-hidden p-5", `bg-gradient-to-br ${card.accent}`)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-2 text-xl font-bold tabular-nums text-foreground sm:text-2xl">
                  {summary ? card.format(summary) : "—"}
                </p>
              </div>
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                  card.iconBg
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
