"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { readApiResponse } from "@/lib/api-error";
import { invalidateCache, invalidateCachePrefix } from "@/lib/client-cache";
import { StockPageSkeleton } from "@/components/ui/skeletons";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { useIsAdmin } from "@/lib/hooks/use-is-admin";
import { StockSummaryCards, type StockSummary } from "@/components/stock/stock-summary-cards";
import {
  StockFilters,
  defaultStockFilters,
  type StockFilterState,
} from "@/components/stock/stock-filters";
import { StockTable, type StockListRow } from "@/components/stock/stock-table";
import { cn } from "@/lib/utils";
import { PrefetchLink } from "@/components/ui/prefetch-link";

type StockDirectoryView = "active" | "deleted";

function buildStockQuery(filters: StockFilterState, view: StockDirectoryView = "active") {
  const params = new URLSearchParams();
  if (view === "deleted") params.set("view", "deleted");
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
  const [directoryView, setDirectoryView] = useState<StockDirectoryView>("active");
  const [searchOpen, setSearchOpen] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<StockListRow | null>(null);
  const [restoreEntry, setRestoreEntry] = useState<StockListRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [purgeEntry, setPurgeEntry] = useState<StockListRow | null>(null);
  const [bulkPurgeOpen, setBulkPurgeOpen] = useState(false);
  const [purging, setPurging] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [filters, setFilters] = useState<StockFilterState>(defaultStockFilters);
  const debouncedQ = useDebouncedValue(filters.q, 150);
  const filtersActive = hasActiveFilters(filters);

  const { isAdmin } = useIsAdmin();

  const listUrl = useMemo(
    () => buildStockQuery({ ...filters, q: debouncedQ }, directoryView),
    [filters, debouncedQ, directoryView]
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

  useEffect(() => {
    setSelectedIds(new Set());
  }, [directoryView]);

  const rows = entries ?? [];
  const isDeletedView = directoryView === "deleted" && isAdmin;
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((row) => row.id)));
    }
  };

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

  const handleRestore = async () => {
    if (!restoreEntry) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/stock/${restoreEntry.id}/restore`, { method: "POST" });
      const result = await readApiResponse(res, "Failed to restore stock entry");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Stock entry restored");
      setRestoreEntry(null);
      invalidateCachePrefix("/api/stock");
      invalidateCache("/api/stock/summary");
      void refetchList();
    } finally {
      setRestoring(false);
    }
  };

  const handlePurge = async () => {
    if (!purgeEntry) return;
    setPurging(true);
    try {
      const res = await fetch(`/api/stock/${purgeEntry.id}/purge`, { method: "POST" });
      const result = await readApiResponse(res, "Failed to permanently delete stock entry");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Stock entry permanently deleted");
      setPurgeEntry(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(purgeEntry.id);
        return next;
      });
      invalidateCachePrefix("/api/stock");
      invalidateCache("/api/stock/summary");
      void refetchList();
    } finally {
      setPurging(false);
    }
  };

  const handleBulkPurge = async () => {
    if (selectedIds.size === 0) return;
    setPurging(true);
    try {
      const res = await fetch("/api/stock/bulk-purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      const result = await readApiResponse(res, "Failed to permanently delete stock entries");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const payload = result.data as { deletedCount?: number } | undefined;
      const count = payload?.deletedCount ?? 0;
      toast.success(
        count === 1 ? "1 stock entry permanently deleted" : `${count} stock entries permanently deleted`
      );
      setBulkPurgeOpen(false);
      setSelectedIds(new Set());
      invalidateCachePrefix("/api/stock");
      invalidateCache("/api/stock/summary");
      void refetchList();
    } finally {
      setPurging(false);
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
          {directoryView === "active" && (
            <Button className="btn-aqua-cta" asChild>
              <PrefetchLink href="/stock/new">
                <Plus className="mr-2 h-4 w-4" />
                Add New Stock Entry
              </PrefetchLink>
            </Button>
          )}
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
              Active Stock
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
              Deleted Stock
            </button>
          </div>
        </div>
      )}

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
        {isDeletedView && rows.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </p>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => setBulkPurgeOpen(true)}
            >
              Delete Permanently Selected
            </Button>
          </div>
        )}
        <StockTable
          rows={rows}
          loading={listLoading && rows.length === 0}
          showCreatedBy={!!isAdmin}
          view={directoryView}
          selectable={isDeletedView}
          selectedIds={selectedIds}
          allSelected={allSelected}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onDelete={directoryView === "active" && isAdmin ? (row) => setDeleteEntry(row) : undefined}
          onRestore={isDeletedView ? (row) => setRestoreEntry(row) : undefined}
          onPurge={isDeletedView ? (row) => setPurgeEntry(row) : undefined}
        />
        {listRefreshing && rows.length > 0 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">Updating…</p>
        )}
      </div>

      <Modal
        open={!!deleteEntry}
        onClose={() => setDeleteEntry(null)}
        title="Delete stock entry"
        description="The entry will be moved to deleted stock. An admin can restore it later."
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
          Soft-delete this stock entry?
          <br />
          It can be restored from the deleted view by an admin.
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

      <Modal
        open={!!restoreEntry}
        onClose={() => setRestoreEntry(null)}
        title="Restore stock entry"
        description="This entry will reappear in active stock inventory."
        footer={
          <>
            <Button variant="outline" onClick={() => setRestoreEntry(null)}>
              Cancel
            </Button>
            <Button disabled={restoring} onClick={handleRestore}>
              {restoring ? "Restoring…" : "Restore"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Restore this stock entry to active inventory?
          {restoreEntry && (
            <>
              <br />
              <strong className="text-foreground">
                {restoreEntry.stockNumber} — {restoreEntry.itemName}
              </strong>
            </>
          )}
        </p>
      </Modal>

      <Modal
        open={!!purgeEntry}
        onClose={() => setPurgeEntry(null)}
        title="Delete permanently"
        description="This will permanently remove the stock entry and its bill file. This action cannot be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setPurgeEntry(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={purging} onClick={handlePurge}>
              {purging ? "Deleting…" : "Delete Permanently"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          This will permanently remove the stock entry and its bill file. This action cannot be
          undone.
          {purgeEntry && (
            <>
              <br />
              <strong className="text-foreground">
                {purgeEntry.stockNumber} — {purgeEntry.itemName}
              </strong>
            </>
          )}
        </p>
      </Modal>

      <Modal
        open={bulkPurgeOpen}
        onClose={() => setBulkPurgeOpen(false)}
        title="Delete permanently"
        description="This will permanently remove the selected stock entries and their bill files. This action cannot be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setBulkPurgeOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={purging} onClick={handleBulkPurge}>
              {purging ? "Deleting…" : "Delete Permanently"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          This will permanently remove the selected stock entries and their bill files. This action
          cannot be undone.
          <br />
          <strong className="text-foreground">{selectedIds.size} entries selected</strong>
        </p>
      </Modal>
    </div>
  );
}
