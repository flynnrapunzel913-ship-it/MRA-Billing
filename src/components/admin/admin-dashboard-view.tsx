"use client";

import { PrefetchLink } from "@/components/ui/prefetch-link";
import { FileText, Users, Clock, Plus, Receipt, ExternalLink, Trash2 } from "lucide-react";
import { DeleteInvoiceDialog } from "@/components/invoices/delete-invoice-dialog";
import { useInvoiceDelete } from "@/lib/hooks/use-invoice-delete";
import type { InvoiceListRow } from "@/lib/invoice-list-utils";
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
import { formatKpiValue, normalizeAdminDashboardKpis } from "@/lib/dashboard-kpis";
import { AdminFinancialSummary } from "@/components/admin/admin-financial-summary";

export interface AdminDashboardData {
  role: "ADMIN";
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
    createdById?: string;
    createdBy?: { name: string };
  }>;
}

const glassCard = cn("glass-panel transition-all duration-200");

const kpiCards = [
  {
    key: "invoices",
    label: "Invoices Generated",
    icon: FileText,
    accent: "from-primary/15 to-primary/5",
    iconBg: "bg-primary/15 text-primary",
  },
  {
    key: "students",
    label: "Active Students",
    icon: Users,
    accent: "from-[#0284C7]/15 to-[#38bdf8]/5",
    iconBg: "bg-[#0284C7]/15 text-[#0284C7]",
  },
  {
    key: "pending",
    label: "Pending Payments",
    icon: Clock,
    accent: "from-amber-500/15 to-amber-400/5",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
] as const;

export function AdminDashboardView({
  data,
  onInvoiceDeleted,
}: {
  data: AdminDashboardData;
  onInvoiceDeleted?: () => void | Promise<void>;
}) {
  const kpis = normalizeAdminDashboardKpis(data as unknown as Record<string, unknown>);
  const { deleteTarget, setDeleteTarget, deleting, handleDelete } = useInvoiceDelete({
    onSuccess: onInvoiceDeleted,
  });

  const kpiValues = {
    invoices: kpis.invoicesGenerated,
    students: kpis.activeStudents,
    pending: kpis.pendingPayments,
  };

  const toListRow = (invoice: AdminDashboardData["recentInvoices"][number]): InvoiceListRow => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerName: invoice.customerName,
    invoiceDate: invoice.invoiceDate,
    grandTotal: invoice.grandTotal,
    paymentStatus: invoice.paymentStatus,
    createdById: invoice.createdById,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Day-to-day overview — invoices, students, and collections
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <PrefetchLink href="/reports/revenue">Revenue Reports</PrefetchLink>
          </Button>
          <Button variant="outline" asChild>
            <PrefetchLink href="/admin/users">User Management</PrefetchLink>
          </Button>
          <Button asChild>
            <PrefetchLink href="/invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </PrefetchLink>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.key}
              className={cn(
                glassCard,
                "group overflow-hidden border-primary/15 hover:-translate-y-0.5 hover:border-primary/30"
              )}
            >
              <CardContent className="relative p-6">
                <div
                  className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80", kpi.accent)}
                  aria-hidden
                />
                <div className="relative flex items-center gap-4">
                  <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", kpi.iconBg)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                    <p className="text-3xl font-bold tabular-nums text-foreground">
                      {formatKpiValue(kpiValues[kpi.key])}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AdminFinancialSummary />

      <Card className={cn(glassCard, "overflow-hidden")}>
        <CardHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Recent Invoices</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">Latest 10 invoices, newest first</p>
        </CardHeader>
        <CardContent className="p-0">
          {(data.recentInvoices ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <FileText className="h-7 w-7" />
              </div>
              <p className="font-semibold text-foreground">No invoices generated yet</p>
              <Button asChild>
                <PrefetchLink href="/invoices/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Invoice
                </PrefetchLink>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
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
                        "transition-colors hover:bg-muted/30",
                        index % 2 === 1 && "bg-muted/20"
                      )}
                    >
                      <TableCell>
                        <PrefetchLink
                          href={`/invoices/${invoice.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </PrefetchLink>
                      </TableCell>
                      <TableCell className="font-medium">{invoice.customerName}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(invoice.invoiceDate)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(Number(invoice.grandTotal))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={paymentStatusBadgeVariant(invoice.paymentStatus)}>
                          {paymentStatusLabel(invoice.paymentStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" className="h-8" asChild>
                            <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                              PDF
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(toListRow(invoice))}
                            aria-label={`Delete ${invoice.invoiceNumber}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteInvoiceDialog
        open={!!deleteTarget}
        invoiceNumber={deleteTarget?.invoiceNumber ?? ""}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}