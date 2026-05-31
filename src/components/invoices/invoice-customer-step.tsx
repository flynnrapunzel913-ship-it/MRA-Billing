"use client";

import { useEffect, useRef, useState } from "react";
import { Search, UserPlus, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  parseSearchQueryForCreate,
  type CustomerSearchResult,
} from "@/lib/customer-search";
import { readApiResponse } from "@/lib/api-error";
import { useInvoiceStore } from "@/stores/invoice-store";
import { QuickCustomerModal } from "@/components/customers/quick-customer-modal";

export function InvoiceCustomerStep() {
  const {
    customerId,
    customerName,
    customerMobile,
    setSelectedCustomer,
    clearSelectedCustomer,
  } = useInvoiceStore();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState({ name: "", mobile: "" });
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebouncedValue(query, 250);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/customers?q=${encodeURIComponent(debouncedQuery.trim())}`
        );
        const result = await readApiResponse<CustomerSearchResult[]>(res, "Search failed");
        if (result.ok) {
          setResults(Array.isArray(result.data) ? result.data : []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [debouncedQuery]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSelect = (customer: CustomerSearchResult) => {
    setSelectedCustomer(customer);
    setQuery(customer.name);
    setOpen(false);
  };

  const openCreateModal = (fromQuery?: string) => {
    setCreatePrefill(parseSearchQueryForCreate(fromQuery ?? query));
    setCreateOpen(true);
    setOpen(false);
  };

  if (customerId) {
    return (
      <>
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-primary/15 dark:bg-card/60">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Check className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{customerName}</p>
                <p className="text-xs text-muted-foreground">Ready for invoice</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              onClick={() => {
                clearSelectedCustomer();
                setQuery("");
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Change
            </Button>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Mobile</dt>
              <dd className="font-medium">{customerMobile || "—"}</dd>
            </div>
          </dl>
        </div>

        <QuickCustomerModal
          open={createOpen}
          initialName={createPrefill.name}
          initialMobile={createPrefill.mobile}
          onClose={() => setCreateOpen(false)}
          onCreated={(c) => {
            setSelectedCustomer(c);
            setQuery(c.name);
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-3" ref={containerRef}>
        <div className="relative">
          <Label className="mb-1.5 block text-sm font-semibold">Find Customer</Label>
          <Search className="pointer-events-none absolute left-3 top-[2.35rem] h-4 w-4 text-muted-foreground" />
          <Input
            className="h-11 border-primary/20 pl-9 text-base"
            placeholder="Search by name or mobile…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => query.trim() && setOpen(true)}
            autoFocus
          />

          {open && query.trim() ? (
            <div
              className={cn(
                "absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border",
                "border-[#E2E8F0] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]",
                "dark:border-white/10 dark:bg-[#0B1730]/95"
              )}
            >
              {loading ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">Searching…</p>
              ) : results.length === 0 ? (
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground">No customers found</p>
                  <button
                    type="button"
                    className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-sm font-medium text-primary hover:bg-primary/5"
                    onClick={() => openCreateModal(query)}
                  >
                    <UserPlus className="h-4 w-4" />
                    Create New Customer
                  </button>
                </div>
              ) : (
                <ul className="max-h-56 overflow-y-auto py-1">
                  {results.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        className="block w-full px-4 py-2.5 text-left transition-colors hover:bg-[#F0F9FF] dark:hover:bg-white/[0.06]"
                        onClick={() => handleSelect(customer)}
                      >
                        <p className="text-sm font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[customer.mobile, customer.membershipId]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </button>
                    </li>
                  ))}
                  <li className="border-t border-[#E2E8F0] dark:border-white/10">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/5"
                      onClick={() => openCreateModal(query)}
                    >
                      <UserPlus className="h-4 w-4" />
                      Create New Customer
                    </button>
                  </li>
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-10 w-full border-dashed border-primary/30 sm:w-auto"
          onClick={() => openCreateModal()}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Create New Customer
        </Button>

        <p className="text-xs text-muted-foreground">
          Search by name or phone. New customers are saved and selected instantly — no page
          switching.
        </p>
      </div>

      <QuickCustomerModal
        open={createOpen}
        initialName={createPrefill.name}
        initialMobile={createPrefill.mobile}
        onClose={() => setCreateOpen(false)}
        onCreated={(c) => {
          setSelectedCustomer(c);
          setQuery(c.name);
        }}
      />
    </>
  );
}

export function validateCustomerStep(customerId: string | null): boolean {
  if (!customerId) {
    toast.error("Select or create a customer to continue");
    return false;
  }
  return true;
}
