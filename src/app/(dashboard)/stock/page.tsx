"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { readApiResponse } from "@/lib/api-error";
import { invalidateCache, invalidateCachePrefix } from "@/lib/client-cache";
import { StockPageSkeleton } from "@/components/ui/skeletons";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { StockSummaryCards, type StockSummary } from "@/components/stock/stock-summary-cards";
import {
  StockFilters,
  defaultStockFilters,
  type StockFilterState,
} from "@/components/stock/stock-filters";
import { StockTable, type StockListRow } from "@/components/stock/stock-table";
import { cn } from "@/lib/utils";
import { PrefetchLink } from "@/components/ui/prefetch-link";

function buildStockQuery(filters: StockFilterState) {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.supplier !== "all") params.set("supplier", filters.supplier);
  if (filters.createdBy !== "all") params.set("createdBy", filters.createdBy);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const qs = params.toString();
  return qs ? `/api/stock?${qs}` : "/api/stock";
}

function hasActiveFilters(filters: StockFilterState) {
  return (
    filters.q.trim() !== "" ||
    filters.category !== "all" ||
    filters.supplier !== "all" ||
    filters.createdBy !== "all" ||
    filters.from !== "" ||
    filters.to !== ""
  );
}

export default function StockInventoryPage() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<StockListRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filters, setFilters] = useState<StockFilterState>(defaultStockFilters);
  const debouncedQ = useDebouncedValue(filters.q, 150);
  const filtersActive = hasActiveFilters(filters);

  const { data: dashboardMeta, isInitialLoading: roleLoading } = useCachedFetch<{
    role?: "ADMIN" | "RECEPTIONIST";
  }>("/api/dashboard");
  const isAdmin = dashboardMeta?.role === "ADMIN";

  const listUrl = useMemo(
    () => buildStockQuery({ ...filters, q: debouncedQ }),
    [filters, debouncedQ]
  );

  const {
    data: entries,
    isInitialLoading: listLoading,
    isRefreshing: listRefreshing,
    refetch: refetchList,
  } = useCachedFetch<StockListRow[]>(listUrl);

  const {
    data: summary,
    isInitialLoading: summaryLoading,
  } = useCachedFetch<StockSummary>("/api/stock/summary");

  const { data: filterOptions } = useCachedFetch<{
    categories: string[];
    suppliers: string[];
    creators: Array<{ id: string; username: string; name: string }>;
  }>("/api/stock/filters", { enabled: searchOpen });

  if (roleLoading && !dashboardMeta) {
    return <StockPageSkeleton kpiCount={2} showFinancial={false} />;
  }

  const rows = entries ?? [];

  const handleDelete = async () => {
    if (!deleteEntry) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/stock/${deleteEntry.id}`, { method: "DELETE" });
      const result = await readApiResponse(res, "Failed to delete stock entry");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Stock entry deleted");
      setDeleteEntry(null);
      invalidateCachePrefix("/api/stock");
      invalidateCache("/api/stock/summary");
      void refetchList();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Stock Inventory</h2>
          <p className="text-sm text-muted-foreground">
            Track physical stock purchases from suppliers
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn(searchOpen && "border-primary/40 bg-primary/5")}
            onClick={() => setSearchOpen((open) => !open)}
          >
            <Search className="mr-2 h-4 w-4" />
            Search Stock Entry
            {filtersActive && !searchOpen && (
              <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Active
              </span>
            )}
          </Button>
          <Button className="btn-aqua-cta" asChild>
            <PrefetchLink href="/stock/new">
              <Plus className="mr-2 h-4 w-4" />
              Add New Stock Entry
            </PrefetchLink>
          </Button>
        </div>
      </div>

      <StockSummaryCards
        summary={summary ?? null}
        loading={summaryLoading && !summary}
        showFinancialMetrics={!!isAdmin}
      />

      {searchOpen && (
        <StockFilters
          filters={filters}
          onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
          isAdmin={!!isAdmin}
          categories={filterOptions?.categories ?? []}
          suppliers={filterOptions?.suppliers ?? []}
          creators={filterOptions?.creators ?? []}
          onClose={() => setSearchOpen(false)}
          onClear={() => setFilters(defaultStockFilters)}
        />
      )}

      <div className="glass-panel p-4 sm:p-6">
        {!searchOpen && filtersActive && (
          <p className="mb-4 text-sm text-muted-foreground">
            Showing filtered results.{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => setSearchOpen(true)}
            >
              Edit search
            </button>
            {" · "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => setFilters(defaultStockFilters)}
            >
              Clear filters
            </button>
          </p>
        )}
        <StockTable
          rows={rows}
          loading={listLoading && rows.length === 0}
          showCreatedBy={!!isAdmin}
          onDelete={(row) => setDeleteEntry(row)}
        />
        {listRefreshing && rows.length > 0 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">Updating…</p>
        )}
      </div>

      <Modal
        open={!!deleteEntry}
        onClose={() => setDeleteEntry(null)}
        title="Delete stock entry"
        description="This action cannot be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteEntry(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Delete this stock entry?
          <br />
          This action cannot be undone.
          {deleteEntry && (
            <>
              <br />
              <strong className="text-foreground">
                {deleteEntry.stockNumber} — {deleteEntry.itemName}
              </strong>
            </>
          )}
        </p>
      </Modal>
    </div>
  );
}
