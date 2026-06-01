"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, History, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { invalidateCache } from "@/lib/client-cache";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { filterInvoicesByQuery } from "@/lib/invoice-search";
import {
  groupInvoicesByMonth,
  splitInvoicesByRecency,
  type InvoiceListRow,
} from "@/lib/invoice-list-utils";
import { InvoicesHistoryTable } from "@/components/invoices/invoices-history-table";
import { DeleteInvoiceDialog } from "@/components/invoices/delete-invoice-dialog";

export default function InvoiceHistoryPage() {
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<InvoiceListRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data: invoices, isLoading, refetch } = useCachedFetch<InvoiceListRow[]>("/api/invoices");
  const list = invoices ?? [];

  const { history, total } = useMemo(() => splitInvoicesByRecency(list), [list]);

  const filteredHistory = useMemo(
    () => filterInvoicesByQuery(history, debouncedQuery),
    [history, debouncedQuery]
  );

  const grouped = useMemo(() => groupInvoicesByMonth(filteredHistory), [filteredHistory]);

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
            {history.length} archived · {total} total invoices
          </span>
        </div>
      </div>

      <div className="glass-panel rounded-[20px] px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 border-0 bg-transparent pl-10 shadow-none focus-visible:ring-primary/30"
            placeholder="Search archived invoices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {history.length === 0 ? (
        <div className="glass-panel rounded-[20px] px-6 py-16 text-center">
          <p className="text-sm font-medium text-foreground">No invoice history yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Older invoices appear here after you have more than 10 on the main list.
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/invoices">Go to Invoices</Link>
          </Button>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="glass-panel rounded-[20px] px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">No archived invoices match your search.</p>
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
              <InvoicesHistoryTable invoices={group.invoices} onDelete={setDeleteTarget} />
            </section>
          ))}
        </div>
      )}

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
