"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { filterInvoicesByQuery, type InvoiceSearchRow } from "@/lib/invoice-search";
import { useDebouncedValue } from "@/lib/use-debounced-value";

interface GlobalInvoiceSearchProps {
  inputRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
}

export function GlobalInvoiceSearch({ inputRef, className }: GlobalInvoiceSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceSearchRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    if (!loaded) return;
    setOpen(debouncedQuery.trim().length > 0);
  }, [debouncedQuery, loaded]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/invoices");
        if (!res.ok) return;
        const data = await res.json();
        setInvoices(
          data.map((inv: InvoiceSearchRow) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customerName,
          }))
        );
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const results = filterInvoicesByQuery(invoices, debouncedQuery).slice(0, 8);

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-md", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
      <Input
        ref={inputRef}
        placeholder="Search invoices, customers..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => debouncedQuery.trim() && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && results[0]) {
            router.push(`/invoices/${results[0].id}`);
            setOpen(false);
            setQuery("");
          }
        }}
        className={cn(
          "h-10 rounded-2xl pl-9 pr-16 text-sm",
          "border-[#E2E8F0] bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
          "placeholder:text-slate-400",
          "focus-visible:border-[#38BDF8]/50 focus-visible:ring-[#0EA5E9]/25",
          "dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:shadow-none",
          "dark:placeholder:text-slate-500 dark:backdrop-blur-md",
          "dark:focus-visible:border-[#38BDF8]/40 dark:focus-visible:ring-[#38BDF8]/25"
        )}
      />
      <kbd
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md px-1.5 py-0.5 text-[10px] font-medium sm:inline",
          "border border-[#E2E8F0] bg-[#F8FAFC] text-slate-500",
          "dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-400"
        )}
      >
        Ctrl+K
      </kbd>

      {open && debouncedQuery.trim() && (
        <div
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl backdrop-blur-xl",
            "border border-[#E2E8F0] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]",
            "dark:border-white/10 dark:bg-[#0B1730]/95 dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
          )}
        >
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">No invoices found</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {results.map((invoice) => (
                <li key={invoice.id}>
                  <Link
                    href={`/invoices/${invoice.id}`}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "block px-4 py-2.5 transition-colors",
                      "hover:bg-[#F0F9FF] dark:hover:bg-white/[0.06]"
                    )}
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {invoice.invoiceNumber}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{invoice.customerName}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
