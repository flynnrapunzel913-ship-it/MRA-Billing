"use client";

import { useMemo, useState } from "react";
import { invalidateCache } from "@/lib/client-cache";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import Link from "next/link";
import { History, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataRowCard } from "@/components/ui/data-row-card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { paymentStatusLabel, paymentStatusBadgeVariant } from "@/lib/constants";
import { filterInvoicesByQuery } from "@/lib/invoice-search";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { DeleteInvoiceDialog } from "@/components/invoices/delete-invoice-dialog";
import {
  RECENT_INVOICE_COUNT,
  splitInvoicesByRecency,
  type InvoiceListRow,
} from "@/lib/invoice-list-utils";

export default function InvoicesPage() {
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<InvoiceListRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data: invoices, isLoading, refetch } = useCachedFetch<InvoiceListRow[]>("/api/invoices");
  const list = invoices ?? [];

  const { recent, history, total } = useMemo(() => splitInvoicesByRecency(list), [list]);

  const filteredRecent = useMemo(
    () => filterInvoicesByQuery(recent, debouncedQuery),
    [recent, debouncedQuery]
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete invoice");
        return;
      }
      toast.success("Invoice deleted successfully");
      setDeleteTarget(null);
      invalidateCache("/api/invoices");
      invalidateCache("/api/dashboard");
      await refetch();
    } catch {
      toast.error("Failed to delete invoice");
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading && list.length === 0) {
    return <PageSkeleton className="mx-auto w-full" />;
  }

  const hasHistory = history.length > 0;

  return (
    <div className="mx-auto w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {hasHistory ? (
            <Button variant="outline" size="lg" asChild>
              <Link href="/invoices/history">
                <History className="mr-2 h-4 w-4" />
                History
                <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                  {history.length}
                </span>
              </Link>
            </Button>
          ) : null}
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link href="/invoices/new">
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Link>
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Showing latest {Math.min(RECENT_INVOICE_COUNT, total)} of {total} invoices
        {hasHistory ? " · older invoices are in History" : ""}
      </p>

      <Card>
        <CardHeader className="pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search recent invoices..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredRecent.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {list.length === 0 ? "No invoices found" : "No recent invoices match your search."}
            </p>
          ) : (
            filteredRecent.map((invoice) => (
              <DataRowCard key={invoice.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="text-base font-semibold text-primary hover:underline"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                    <p className="text-sm text-foreground/90">{invoice.customerName}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(invoice.invoiceDate)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(Number(invoice.grandTotal))}
                    </p>
                    <Badge variant={paymentStatusBadgeVariant(invoice.paymentStatus)}>
                      {paymentStatusLabel(invoice.paymentStatus)}
                    </Badge>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                          PDF
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(invoice)}
                        aria-label={`Delete ${invoice.invoiceNumber}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </DataRowCard>
            ))
          )}
        </CardContent>
      </Card>

      {hasHistory ? (
        <div className="flex justify-center">
          <Button variant="outline" asChild>
            <Link href="/invoices/history">
              <History className="mr-2 h-4 w-4" />
              View all {history.length} older invoices
            </Link>
          </Button>
        </div>
      ) : null}

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
