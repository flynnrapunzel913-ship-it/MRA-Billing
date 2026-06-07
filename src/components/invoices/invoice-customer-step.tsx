"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { customerToSearchResult, type CustomerSearchResult } from "@/lib/customer-search";
import { readApiResponse } from "@/lib/api-error";
import { invalidateCachePrefix } from "@/lib/client-cache";
import { sanitizeMobileInput } from "@/lib/mobile-input";
import { useInvoiceStore } from "@/stores/invoice-store";

function normalizeMobile(value: string) {
  return sanitizeMobileInput(value);
}

function formatMobileDisplay(digits: string) {
  const d = digits.slice(0, 10);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}

export function InvoiceCustomerStep() {
  const {
    customerId,
    customerName,
    customerMobile,
    setSelectedCustomer,
    setCustomerName,
    setCustomerMobile,
    clearCustomerLink,
  } = useInvoiceStore();

  const [nameOpen, setNameOpen] = useState(false);
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLDivElement>(null);
  const debouncedName = useDebouncedValue(customerName, 250);

  useEffect(() => {
    if (!nameOpen || !debouncedName.trim()) {
      setResults([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/customers?q=${encodeURIComponent(debouncedName.trim())}`
        );
        const result = await readApiResponse<CustomerSearchResult[]>(res, "Search failed");
        if (result.ok) {
          const rows = Array.isArray(result.data) ? result.data : [];
          setResults(rows.map((row) => customerToSearchResult(row)));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [debouncedName, nameOpen]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (nameRef.current && !nameRef.current.contains(e.target as Node)) {
        setNameOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSelect = (customer: CustomerSearchResult) => {
    setSelectedCustomer(customer);
    if (customer.mobile) {
      setCustomerMobile(formatMobileDisplay(normalizeMobile(customer.mobile)));
    }
    setNameOpen(false);
  };

  const handleNameChange = (value: string) => {
    if (customerId) clearCustomerLink();
    setCustomerName(value);
    setNameOpen(true);
  };

  const handleMobileChange = (value: string) => {
    if (customerId) clearCustomerLink();
    const digits = normalizeMobile(value);
    setCustomerMobile(formatMobileDisplay(digits));
  };

  const mobileDigits = normalizeMobile(customerMobile);
  const isExisting = Boolean(customerId);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative space-y-1.5" ref={nameRef}>
          <Label htmlFor="invoice-customer-name" className="text-sm font-semibold">
            Customer Name *
          </Label>
          <Input
            id="invoice-customer-name"
            className="h-11 text-base"
            placeholder="Start typing a name…"
            value={customerName}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => customerName.trim() && setNameOpen(true)}
            autoComplete="off"
            autoFocus
          />

          {nameOpen && customerName.trim() ? (
            <div
              className={cn(
                "absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border",
                "border-border bg-card shadow-[var(--shadow-card)]"
              )}
            >
              {loading ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">Searching…</p>
              ) : results.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  No saved match — enter mobile below; customer will be saved when you continue.
                </p>
              ) : (
                <ul className="max-h-48 overflow-y-auto py-1">
                  {results.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        className="block w-full px-4 py-2.5 text-left transition-colors hover:bg-primary/5"
                        onClick={() => handleSelect(customer)}
                      >
                        <p className="text-sm font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {customer.mobile || "No mobile on file"}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invoice-customer-mobile" className="text-sm font-semibold">
            Mobile Number *
          </Label>
          <Input
            id="invoice-customer-mobile"
            className="h-11 text-base"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="10-digit mobile"
            value={customerMobile}
            maxLength={12}
            onChange={(e) => handleMobileChange(e.target.value)}
          />
          {isExisting ? (
            <p className="text-xs text-muted-foreground">
              Loaded from saved customer. Edit the name to use a different number.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Required for new customers — saved to your directory when you go to the next step.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function validateCustomerStep(
  customerName: string,
  customerMobile: string
): boolean {
  const name = customerName.trim();
  const mobile = normalizeMobile(customerMobile);

  if (!name) {
    toast.error("Enter customer name");
    return false;
  }
  if (mobile.length < 10) {
    toast.error("Enter a valid 10-digit mobile number");
    return false;
  }
  return true;
}

/** Ensures customer exists in DB (link, match by mobile, or create). */
export async function prepareCustomerStep(): Promise<boolean> {
  const state = useInvoiceStore.getState();
  const name = state.customerName.trim();
  const mobile = normalizeMobile(state.customerMobile);

  if (!validateCustomerStep(name, state.customerMobile)) {
    return false;
  }

  if (state.customerId) {
    return true;
  }

  try {
    const searchRes = await fetch(`/api/customers?q=${encodeURIComponent(mobile)}`);
    const searchResult = await readApiResponse<CustomerSearchResult[]>(
      searchRes,
      "Could not look up customer"
    );
    if (searchResult.ok) {
      const rows = Array.isArray(searchResult.data) ? searchResult.data : [];
      const existing = rows.find((row) => normalizeMobile(row.mobile ?? "") === mobile);
      if (existing) {
        const linked = customerToSearchResult(existing);
        state.setSelectedCustomer(linked);
        state.setCustomerMobile(formatMobileDisplay(mobile));
        if (linked.name.toLowerCase() !== name.toLowerCase()) {
          state.setCustomerName(name);
        }
        invalidateCachePrefix("/api/customers");
        return true;
      }
    }

    const createRes = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, mobile, status: "ACTIVE" }),
    });
    const createResult = await readApiResponse<{
      id: string;
      name: string;
      mobile: string | null;
      membershipId: string;
      dateJoined: string;
      status: string;
    }>(createRes, "Failed to save customer");

    if (!createResult.ok) {
      toast.error(createResult.message);
      return false;
    }

    state.setSelectedCustomer(customerToSearchResult(createResult.data));
    state.setCustomerMobile(formatMobileDisplay(mobile));
    invalidateCachePrefix("/api/customers");
    toast.success("Customer saved");
    return true;
  } catch {
    toast.error("Failed to save customer");
    return false;
  }
}
