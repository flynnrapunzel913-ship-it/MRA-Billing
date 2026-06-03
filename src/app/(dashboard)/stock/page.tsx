"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { readApiResponse } from "@/lib/api-error";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { cn } from "@/lib/utils";
import { StockSummaryCards, type StockSummary } from "@/components/stock/stock-summary-cards";
import {
  StockFilters,
  defaultStockFilters,
  type StockFilterState,
} from "@/components/stock/stock-filters";
import { StockTable, type StockListRow } from "@/components/stock/stock-table";

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
  const [filters, setFilters] = useState<StockFilterState>(defaultStockFilters);
  const debouncedQ = useDebouncedValue(filters.q, 250);
  const filtersActive = hasActiveFilters(filters);

  const { data: dashboardMeta } = useCachedFetch<{ role?: "ADMIN" | "RECEPTIONIST" }>(
    "/api/dashboard"
  );
  const isAdmin = dashboardMeta?.role === "ADMIN";

  const listUrl = useMemo(
    () => buildStockQuery({ ...filters, q: debouncedQ }),
    [filters, debouncedQ]
  );

  const [entries, setEntries] = useState<StockListRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(listUrl);
      const result = await readApiResponse<StockListRow[]>(res, "Failed to load stock");
      if (result.ok) {
        setEntries(Array.isArray(result.data) ? result.data : []);
      } else {
        toast.error(result.message);
      }
    } finally {
      setLoading(false);
    }
  }, [listUrl]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const { data: summary, isLoading: summaryLoading } = useCachedFetch<StockSummary>(
    "/api/stock/summary"
  );

  const [filterOptions, setFilterOptions] = useState<{
    categories: string[];
    suppliers: string[];
    creators: Array<{ id: string; username: string; name: string }>;
  }>({ categories: [], suppliers: [], creators: [] });

  useEffect(() => {
    if (!searchOpen) return;
    void (async () => {
      const res = await fetch("/api/stock/filters");
      const result = await readApiResponse<typeof filterOptions>(res, "Failed to load filters");
      if (result.ok) setFilterOptions(result.data);
    })();
  }, [searchOpen]);

  if (!dashboardMeta && summaryLoading) {
    return <PageSkeleton />;
  }

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
            <Link href="/stock/new">
              <Plus className="mr-2 h-4 w-4" />
              Add New Stock Entry
            </Link>
          </Button>
        </div>
      </div>

      <StockSummaryCards
        summary={summary ?? null}
        loading={summaryLoading}
        showFinancialMetrics={!!isAdmin}
      />

      {searchOpen && (
        <StockFilters
          filters={filters}
          onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
          isAdmin={!!isAdmin}
          categories={filterOptions.categories}
          suppliers={filterOptions.suppliers}
          creators={filterOptions.creators}
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
        <StockTable rows={entries} loading={loading} showCreatedBy={!!isAdmin} />
      </div>
    </div>
  );
}
