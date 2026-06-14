"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { readApiResponse } from "@/lib/api-error";

type CatalogType = "subscription" | "product";

type SubscriptionOption = {
  id: string;
  name: string;
  duration: string;
  durationValue?: number;
  durationUnit?: string;
  usageDays?: number | null;
  price: number;
  description?: string | null;
};

type ProductOption = {
  id: string;
  name: string;
  price: number;
  description?: string | null;
};

interface CatalogItemPickerProps {
  type: CatalogType;
  label: string;
  placeholder?: string;
  onSelect: (item: SubscriptionOption | ProductOption) => void;
  className?: string;
}

export function CatalogItemPicker({
  type,
  label,
  placeholder,
  onSelect,
  className,
}: CatalogItemPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<(SubscriptionOption | ProductOption)[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebouncedValue(query, 200);

  const endpoint =
    type === "subscription" ? "/api/catalog/subscriptions" : "/api/catalog/products";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
        const res = await fetch(`${endpoint}?${params}`);
        const result = await readApiResponse<SubscriptionOption[] | ProductOption[]>(
          res,
          "Failed to load catalog"
        );
        if (result.ok) {
          setOptions(Array.isArray(result.data) ? result.data : []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [debouncedQuery, endpoint]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSelect = (item: SubscriptionOption | ProductOption) => {
    onSelect(item);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-primary/80">
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 pl-9"
          placeholder={placeholder ?? `Search ${type === "subscription" ? "subscriptions" : "products"}…`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && (
        <ul
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[#E2E8F0] bg-white py-1 shadow-lg dark:border-white/10 dark:bg-card"
          role="listbox"
        >
          {loading && (
            <li className="px-3 py-2 text-sm text-muted-foreground">Loading…</li>
          )}
          {!loading && options.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              No {type === "subscription" ? "subscriptions" : "products"} found
            </li>
          )}
          {!loading &&
            options.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-[#E8F4FE] dark:hover:bg-[#0070C0]/15"
                  onClick={() => handleSelect(item)}
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {type === "subscription" && "duration" in item
                      ? `${(item as SubscriptionOption).duration} · `
                      : ""}
                    {formatCurrency(item.price)}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
