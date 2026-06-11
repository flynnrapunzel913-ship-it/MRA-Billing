"use client";

import { useMemo } from "react";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import {
  FileText,
  Users,
  Clock,
  Plus,
  Receipt,
} from "lucide-react";
import { RecentInvoicesTable } from "@/components/dashboard/recent-invoices-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AdminDashboardView,
  type AdminDashboardData,
} from "@/components/admin/admin-dashboard-view";
import {
  formatKpiValue,
  normalizeDashboardPayload,
  normalizeReceptionistDashboardKpis,
} from "@/lib/dashboard-kpis";

interface ReceptionistDashboardData {
  role: "RECEPTIONIST";
  activeCustomers: number;
  invoicesToday: number;
  pendingPayments: number;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    paymentStatus: string;
    invoiceDate: string;
    items?: Array<{ description: string; itemType: string }>;
  }>;
}

type DashboardData = ReceptionistDashboardData | AdminDashboardData;

function isAdminDashboard(data: DashboardData): data is AdminDashboardData {
  return data.role === "ADMIN";
}

const glassCard = cn("glass-panel transition-all duration-200");

const receptionistKpiCards = [
  {
    key: "customers" as const,
    label: "Active Customers",
    icon: Users,
    accent: "from-[#0284C7]/15 to-[#38bdf8]/5",
    iconBg: "bg-[#0284C7]/15 text-[#0284C7]",
  },
  {
    key: "invoicesToday" as const,
    label: "Invoices Generated Today",
    icon: FileText,
    accent: "from-primary/15 to-primary/5",
    iconBg: "bg-primary/15 text-primary",
  },
  {
    key: "pending" as const,
    label: "Pending Payments",
    icon: Clock,
    accent: "from-amber-500/15 to-amber-400/5",
    iconBg: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  },
] as const;

function ReceptionistDashboard({ data }: { data: ReceptionistDashboardData }) {
  const kpis = normalizeReceptionistDashboardKpis(data as unknown as Record<string, unknown>);

  const kpiValues = {
    customers: kpis.activeCustomers,
    invoicesToday: kpis.invoicesToday,
    pending: kpis.pendingPayments,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" asChild>
          <PrefetchLink href="/stock/new">Add Stock Entry</PrefetchLink>
        </Button>
        <Button asChild size="lg">
          <PrefetchLink href="/invoices/new">
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </PrefetchLink>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {receptionistKpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.key}
              className={cn(
                glassCard,
                "group overflow-hidden border-primary/15 hover:-translate-y-0.5 hover:border-primary/30"
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
                    <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-3xl">
                      {formatKpiValue(kpiValues[kpi.key])}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className={cn(glassCard, "overflow-hidden")}>
          <CardHeader className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Recent Invoices</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Latest invoices — search and reprint anytime</p>
          </CardHeader>
          <CardContent className="p-0">
            {(data.recentInvoices ?? []).length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                No invoices yet. Create one to get started.
              </p>
            ) : (
              <RecentInvoicesTable invoices={data.recentInvoices ?? []} />
            )}
            <div className="border-t border-border px-5 py-3">
              <Button variant="ghost" size="sm" asChild>
                <PrefetchLink href="/invoices">View all invoices</PrefetchLink>
              </Button>
            </div>
          </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { data: raw, isInitialLoading, error, refetch } = useCachedFetch<Record<string, unknown>>(
    "/api/dashboard"
  );

  const data = useMemo(
    () => (raw ? (normalizeDashboardPayload(raw) as DashboardData) : null),
    [raw]
  );

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <p>{error}</p>
        <p className="text-sm">Try refreshing the page or run database migrations.</p>
      </div>
    );
  }

  if (!data) {
    return isInitialLoading ? <DashboardSkeleton kpiCount={3} /> : null;
  }

  if (isAdminDashboard(data)) {
    return <AdminDashboardView data={data} onInvoiceDeleted={() => refetch()} />;
  }

  return <ReceptionistDashboard data={data} />;
}
