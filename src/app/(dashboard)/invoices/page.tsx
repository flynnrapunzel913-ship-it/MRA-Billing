"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { useInvoiceDelete } from "@/lib/hooks/use-invoice-delete";
import { canDeleteInvoice } from "@/lib/invoice-permissions";
import { ListPageSkeleton } from "@/components/ui/skeletons";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { History, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataRowCard } from "@/components/ui/data-row-card";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { paymentStatusLabel, paymentStatusBadgeVariant } from "@/lib/constants";
import { filterInvoicesByQuery } from "@/lib/invoice-search";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { DeleteInvoiceDialog } from "@/components/invoices/delete-invoice-dialog";
import { readApiResponse } from "@/lib/api-error";
import { invalidateCachePrefix } from "@/lib/client-cache";
import { toast } from "sonner";
import {
  RECENT_INVOICE_COUNT,
  splitInvoicesByRecency,
  type InvoiceListRow,
} from "@/lib/invoice-list-utils";

type InvoiceDirectoryView = "active" | "deleted";

export default function InvoicesPage() {
  const { data: session } = useSession();
  const [directoryView, setDirectoryView] = useState<InvoiceDirectoryView>("active");
  const [query, setQuery] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<InvoiceListRow | null>(null);
  const [restoring, setRestoring] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 150);
  const { deleteTarget, setDeleteTarget, deleting, handleDelete } = useInvoiceDelete();

  const { data: dashboardMeta } = useCachedFetch<{ role?: "ADMIN" | "RECEPTIONIST" }>(
    "/api/dashboard"
  );
  const isAdmin = dashboardMeta?.role === "ADMIN" || session?.user?.role === "ADMIN";
  const isDeletedView = directoryView === "deleted" && isAdmin;

  const listUrl =
    directoryView === "deleted" ? "/api/invoices?view=deleted" : "/api/invoices";

  const { data: invoices, isInitialLoading, refetch } = useCachedFetch<InvoiceListRow[]>(listUrl);
  const list = invoices ?? [];

  const { recent, history, total } = useMemo(() => splitInvoicesByRecency(list), [list]);

  const displayedInvoices = useMemo(() => {
    if (isDeletedView) {
      return filterInvoicesByQuery(list, debouncedQuery);
    }
    return filterInvoicesByQuery(recent, debouncedQuery);
  }, [isDeletedView, list, recent, debouncedQuery]);

  const onConfirmDelete = async () => {
    await handleDelete();
    await refetch();
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/invoices/${restoreTarget.id}/restore`, { method: "POST" });
      const result = await readApiResponse(res, "Failed to restore invoice");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Invoice restored");
      setRestoreTarget(null);
      invalidateCachePrefix("/api/invoices");
      void refetch();
    } finally {
      setRestoring(false);
    }
  };

  if (isInitialLoading && list.length === 0) {
    return <ListPageSkeleton />;
  }

  const hasHistory = !isDeletedView && history.length > 0;

  return (
    <div className="mx-auto w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {hasHistory ? (
            <Button variant="outline" size="lg" asChild>
              <PrefetchLink href="/invoices/history">
                <History className="mr-2 h-4 w-4" />
                History
                <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                  {history.length}
                </span>
              </PrefetchLink>
            </Button>
          ) : null}
        </div>
        {directoryView === "active" && (
          <Button asChild size="lg" className="shrink-0">
            <PrefetchLink href="/invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </PrefetchLink>
          </Button>
        )}
      </div>

      {isAdmin && (
        <div className="flex justify-center">
          <div className="inline-flex rounded-full border border-border/60 bg-card/40 p-1">
            <button
              type="button"
              onClick={() => setDirectoryView("active")}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                directoryView === "active"
                  ? "nav-pill-active"
                  : "text-foreground/80 hover:bg-muted/40"
              )}
            >
              Active Invoices
            </button>
            <button
              type="button"
              onClick={() => setDirectoryView("deleted")}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                directoryView === "deleted"
                  ? "nav-pill-active"
                  : "text-foreground/80 hover:bg-muted/40"
              )}
            >
              Deleted Invoices
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {isDeletedView
          ? `${displayedInvoices.length} deleted invoice${displayedInvoices.length === 1 ? "" : "s"}`
          : `Showing latest ${Math.min(RECENT_INVOICE_COUNT, total)} of ${total} invoices${hasHistory ? " · older invoices are in History" : ""}`}
      </p>

      <Card>
        <CardHeader className="pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder={
                isDeletedView ? "Search deleted invoices..." : "Search recent invoices..."
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {displayedInvoices.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {isDeletedView
                ? list.length === 0
                  ? "No deleted invoices."
                  : "No deleted invoices match your search."
                : list.length === 0
                  ? "No invoices found"
                  : "No recent invoices match your search."}
            </p>
          ) : (
            displayedInvoices.map((invoice) => (
              <DataRowCard key={invoice.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    {isDeletedView ? (
                      <p className="text-base font-semibold text-foreground">
                        {invoice.invoiceNumber}
                      </p>
                    ) : (
                      <PrefetchLink
                        href={`/invoices/${invoice.id}`}
                        className="text-base font-semibold text-primary hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </PrefetchLink>
                    )}
                    <p className="text-sm text-foreground/90">{invoice.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(invoice.invoiceDate)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(Number(invoice.grandTotal))}
                    </p>
                    <Badge variant={paymentStatusBadgeVariant(invoice.paymentStatus)}>
                      {paymentStatusLabel(invoice.paymentStatus)}
                    </Badge>
                    <div className="flex gap-1">
                      {!isDeletedView && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={`/api/invoices/${invoice.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            PDF
                          </a>
                        </Button>
                      )}
                      {!isDeletedView &&
                      canDeleteInvoice(session?.user?.role, session?.user?.id, invoice) ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(invoice)}
                          aria-label={`Delete ${invoice.invoiceNumber}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {isDeletedView && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRestoreTarget(invoice)}
                        >
                          <RotateCcw className="mr-1.5 h-4 w-4" />
                          Restore
                        </Button>
                      )}
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
            <PrefetchLink href="/invoices/history">
              <History className="mr-2 h-4 w-4" />
              View all {history.length} older invoices
            </PrefetchLink>
          </Button>
        </div>
      ) : null}

      <DeleteInvoiceDialog
        open={!!deleteTarget}
        invoiceNumber={deleteTarget?.invoiceNumber ?? ""}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onConfirmDelete}
      />

      <Modal
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        title="Restore Invoice"
        description="This will restore the invoice and make it visible throughout the system again."
        footer={
          <>
            <Button variant="outline" onClick={() => setRestoreTarget(null)}>
              Cancel
            </Button>
            <Button disabled={restoring} onClick={handleRestore}>
              {restoring ? "Restoring…" : "Restore"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          This will restore the invoice and make it visible throughout the system again.
          {restoreTarget && (
            <>
              <br />
              <strong className="text-foreground">{restoreTarget.invoiceNumber}</strong>
            </>
          )}
        </p>
      </Modal>
    </div>
  );
}
