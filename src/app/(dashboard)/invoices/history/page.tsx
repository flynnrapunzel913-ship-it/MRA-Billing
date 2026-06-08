"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, History, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { cn } from "@/lib/utils";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { useInvoiceDelete } from "@/lib/hooks/use-invoice-delete";
import { canDeleteInvoice } from "@/lib/invoice-permissions";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { filterInvoicesByQuery } from "@/lib/invoice-search";
import { readApiResponse } from "@/lib/api-error";
import { invalidateCachePrefix } from "@/lib/client-cache";
import {
  groupInvoicesByMonth,
  splitInvoicesByRecency,
  type InvoiceListRow,
} from "@/lib/invoice-list-utils";
import { InvoicesHistoryTable } from "@/components/invoices/invoices-history-table";
import { DeleteInvoiceDialog } from "@/components/invoices/delete-invoice-dialog";

type InvoiceDirectoryView = "active" | "deleted";

export default function InvoiceHistoryPage() {
  const { data: session } = useSession();
  const [directoryView, setDirectoryView] = useState<InvoiceDirectoryView>("active");
  const [query, setQuery] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<InvoiceListRow | null>(null);
  const [restoring, setRestoring] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);
  const { deleteTarget, setDeleteTarget, deleting, handleDelete } = useInvoiceDelete();

  const { data: dashboardMeta } = useCachedFetch<{ role?: "ADMIN" | "RECEPTIONIST" }>(
    "/api/dashboard"
  );
  const isAdmin = dashboardMeta?.role === "ADMIN" || session?.user?.role === "ADMIN";
  const isDeletedView = directoryView === "deleted" && isAdmin;

  const listUrl =
    directoryView === "deleted" ? "/api/invoices?view=deleted" : "/api/invoices";

  const { data: invoices, isLoading, refetch } = useCachedFetch<InvoiceListRow[]>(listUrl);
  const list = invoices ?? [];

  const { history, total } = useMemo(() => splitInvoicesByRecency(list), [list]);

  const sourceRows = isDeletedView ? list : history;

  const filteredRows = useMemo(
    () => filterInvoicesByQuery(sourceRows, debouncedQuery),
    [sourceRows, debouncedQuery]
  );

  const grouped = useMemo(() => groupInvoicesByMonth(filteredRows), [filteredRows]);

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

  const canDelete = (invoice: InvoiceListRow) =>
    canDeleteInvoice(session?.user?.role, session?.user?.id, invoice);

  if (isLoading && list.length === 0) {
    return <PageSkeleton className="mx-auto w-full" />;
  }

  return (
    <div className="mx-auto w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" size="sm" asChild className="w-fit">
          <Link href="/invoices">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Link>
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <History className="h-4 w-4 text-primary" />
          <span>
            {isDeletedView
              ? `${list.length} deleted invoice${list.length === 1 ? "" : "s"}`
              : `${history.length} archived · ${total} total invoices`}
          </span>
        </div>
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

      <div className="glass-panel rounded-[20px] px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 border-0 bg-transparent pl-10 shadow-none focus-visible:ring-primary/30"
            placeholder={
              isDeletedView ? "Search deleted invoices..." : "Search archived invoices..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {sourceRows.length === 0 ? (
        <div className="glass-panel rounded-[20px] px-6 py-16 text-center">
          <p className="text-sm font-medium text-foreground">
            {isDeletedView ? "No deleted invoices." : "No invoice history yet."}
          </p>
          {!isDeletedView && (
            <p className="mt-1 text-xs text-muted-foreground">
              Older invoices appear here after you have more than 10 on the main list.
            </p>
          )}
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/invoices">Go to Invoices</Link>
          </Button>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="glass-panel rounded-[20px] px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {isDeletedView
              ? "No deleted invoices match your search."
              : "No archived invoices match your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.monthKey} className="space-y-3">
              <div className="flex items-center justify-between gap-2 px-1">
                <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
                  {group.monthLabel}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {group.invoices.length} invoice{group.invoices.length === 1 ? "" : "s"}
                </span>
              </div>
              <InvoicesHistoryTable
                invoices={group.invoices}
                view={directoryView}
                onDelete={isDeletedView ? undefined : setDeleteTarget}
                canDelete={isDeletedView ? undefined : canDelete}
                onRestore={isDeletedView ? setRestoreTarget : undefined}
              />
            </section>
          ))}
        </div>
      )}

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
