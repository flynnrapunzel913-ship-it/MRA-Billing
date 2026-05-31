"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Users, Clock, Plus, Receipt, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { paymentStatusLabel, paymentStatusBadgeVariant } from "@/lib/constants";
import {
  AdminDashboardView,
  type AdminDashboardData,
} from "@/components/admin/admin-dashboard-view";
import { readApiResponse } from "@/lib/api-error";
import { formatKpiValue, normalizeDashboardKpis, normalizeDashboardPayload } from "@/lib/dashboard-kpis";

interface ReceptionistDashboardData {
  role: "RECEPTIONIST";
  invoicesGenerated: number;
  activeStudents: number;
  pendingPayments: number;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    grandTotal: string | number;
    paymentStatus: string;
    invoiceDate: string;
  }>;
}

type DashboardData = ReceptionistDashboardData | AdminDashboardData;

function isAdminDashboard(data: DashboardData): data is AdminDashboardData {
  return data.role === "ADMIN";
}

const glassCard = cn(
  "rounded-xl border backdrop-blur-md transition-all duration-200",
  "border-[#E2E8F0]/90 bg-white/90 shadow-[0_4px_24px_rgba(0,112,192,0.07)]",
  "dark:border-white/10 dark:bg-card/85 dark:shadow-[0_4px_24px_rgba(0,112,192,0.12)]"
);

const kpiCards = [
  {
    key: "invoices",
    label: "Invoices Generated",
    icon: FileText,
    accent: "from-[#0070C0]/15 to-[#0EA5E9]/5",
    iconBg: "bg-[#0070C0]/10 text-[#0070C0] dark:bg-[#0070C0]/20 dark:text-[#38bdf8]",
  },
  {
    key: "students",
    label: "Active Students",
    icon: Users,
    accent: "from-[#0284C7]/15 to-[#38bdf8]/5",
    iconBg: "bg-[#0284C7]/10 text-[#0284C7] dark:bg-[#0284C7]/20 dark:text-[#38bdf8]",
  },
  {
    key: "pending",
    label: "Pending Payments",
    icon: Clock,
    accent: "from-amber-500/15 to-amber-400/5",
    iconBg: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  },
] as const;

function ReceptionistDashboard({ data }: { data: ReceptionistDashboardData }) {
  const kpis = normalizeDashboardKpis(data as unknown as Record<string, unknown>);

  const kpiValues = {
    invoices: kpis.invoicesGenerated,
    students: kpis.activeStudents,
    pending: kpis.pendingPayments,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Day-to-day overview — invoices, students, and collections
          </p>
        </div>
        <Button asChild className="bg-[#0070C0] hover:bg-[#005499]">
          <Link href="/invoices/new">
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.key}
              className={cn(
                glassCard,
                "group overflow-hidden border-[#0070C0]/15 hover:-translate-y-0.5 hover:border-[#0070C0]/30 hover:shadow-[0_8px_32px_rgba(0,112,192,0.14)]"
              )}
            >
              <CardContent className="relative p-6 sm:p-7">
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
                    kpi.accent
                  )}
                  aria-hidden
                />
                <div className="relative flex items-center gap-5">
                  <div
                    className={cn(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105",
                      kpi.iconBg
                    )}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                    <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
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
        <CardHeader className="border-b border-[#E2E8F0]/80 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#0070C0] dark:text-[#38bdf8]" />
            <CardTitle className="text-lg">Recent Invoices</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">Latest 10 invoices, newest first</p>
        </CardHeader>
        <CardContent className="p-0">
          {(data.recentInvoices ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0070C0]/10 text-[#0070C0]">
                <FileText className="h-7 w-7" />
              </div>
              <div>
                <p className="font-semibold text-foreground">No invoices generated yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first invoice to start tracking academy billing.
                </p>
              </div>
              <Button asChild className="bg-[#0070C0] hover:bg-[#005499]">
                <Link href="/invoices/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Invoice
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#E2E8F0]/80 bg-[#E8F4FE]/50 hover:bg-[#E8F4FE]/50 dark:border-white/10 dark:bg-[#0070C0]/10">
                    <TableHead className="font-semibold">Invoice No</TableHead>
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold text-right">Amount</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.recentInvoices ?? []).map((invoice, index) => (
                    <TableRow
                      key={invoice.id}
                      className={cn(
                        "border-[#E2E8F0]/60 transition-colors hover:bg-[#0070C0]/[0.03] dark:border-white/5",
                        index % 2 === 1 && "bg-[#F8FAFC]/60 dark:bg-white/[0.02]"
                      )}
                    >
                      <TableCell>
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-semibold text-[#0070C0] hover:underline dark:text-[#38bdf8]"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">{invoice.customerName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(invoice.invoiceDate)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(Number(invoice.grandTotal))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={paymentStatusBadgeVariant(invoice.paymentStatus)}>
                          {paymentStatusLabel(invoice.paymentStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="h-8 border-[#0070C0]/25" asChild>
                          <a
                            href={`/api/invoices/${invoice.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            View PDF
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        const result = await readApiResponse(res, "Failed to load dashboard");
        if (!result.ok) {
          setLoadError(result.message);
          setData(null);
          return;
        }
        const payload = result.data as unknown as Record<string, unknown>;
        setData(normalizeDashboardPayload(payload) as DashboardData);
      })
      .catch(() => setLoadError("Failed to load dashboard"));
  }, []);

  if (loadError) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <p>{loadError}</p>
        <p className="text-sm">Try refreshing the page or run database migrations.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Loading dashboard…
      </div>
    );
  }

  if (isAdminDashboard(data)) {
    return <AdminDashboardView data={data} />;
  }

  return <ReceptionistDashboard data={data} />;
}
