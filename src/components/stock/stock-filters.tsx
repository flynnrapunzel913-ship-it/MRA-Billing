"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { STOCK_CATEGORIES } from "@/lib/constants";

export type StockFilterState = {
  q: string;
  category: string;
  supplier: string;
  createdBy: string;
  from: string;
  to: string;
};

export const defaultStockFilters: StockFilterState = {
  q: "",
  category: "all",
  supplier: "all",
  createdBy: "all",
  from: "",
  to: "",
};

export function StockFilters({
  filters,
  onChange,
  isAdmin,
  categories,
  suppliers,
  creators,
  onClose,
  onClear,
}: {
  filters: StockFilterState;
  onChange: (patch: Partial<StockFilterState>) => void;
  isAdmin: boolean;
  categories: string[];
  suppliers: string[];
  creators: Array<{ id: string; username: string; name: string }>;
  onClose?: () => void;
  onClear?: () => void;
}) {
  const selectClass = cn(
    "h-10 w-full rounded-xl border border-input bg-background/80 px-3 text-sm",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  );

  return (
    <div className="glass-panel space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Search Stock Entry</h3>
          <p className="text-xs text-muted-foreground">
            Filter by item, supplier, category, or date range
          </p>
        </div>
        <div className="flex gap-2">
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-primary hover:underline"
            >
              Close
            </button>
          )}
        </div>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="Search item, supplier, or stock number…"
          className="h-10 rounded-xl pl-9"
        />
      </div>

      <div
        className={cn(
          "grid gap-3",
          isAdmin ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-3"
        )}
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
          <select
            value={filters.category}
            onChange={(e) => onChange({ category: e.target.value })}
            className={selectClass}
          >
            <option value="all">All categories</option>
            {Array.from(new Set([...STOCK_CATEGORIES, ...categories])).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Supplier</label>
          <select
            value={filters.supplier}
            onChange={(e) => onChange({ supplier: e.target.value })}
            className={selectClass}
          >
            <option value="all">All suppliers</option>
            {suppliers.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Receptionist
            </label>
            <select
              value={filters.createdBy}
              onChange={(e) => onChange({ createdBy: e.target.value })}
              className={selectClass}
            >
              <option value="all">All staff</option>
              {creators.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">From date</label>
          <Input
            type="date"
            value={filters.from}
            onChange={(e) => onChange({ from: e.target.value })}
            className="h-10 rounded-xl"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">To date</label>
          <Input
            type="date"
            value={filters.to}
            onChange={(e) => onChange({ to: e.target.value })}
            className="h-10 rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
