"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ListPageSkeleton } from "@/components/ui/skeletons";
import { cn } from "@/lib/utils";
import { invalidateCache, invalidateCachePrefix } from "@/lib/client-cache";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { CustomerDrawer } from "@/components/customers/customer-drawer";
import { CustomersTable } from "@/components/customers/customers-table";
import { ServiceFilterSelect } from "@/components/customers/service-filter";
import { readApiResponse } from "@/lib/api-error";
import {
  buildCustomerInvoiceIndex,
  filterCustomers,
  type CustomerListRow,
  type QuickFilter,
  type ServiceFilter,
} from "@/lib/customer-list-utils";

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: "all", label: "All Customers" },
  { id: "active", label: "Active" },
  { id: "renewal_due", label: "Renewal Due" },
  { id: "pending_payment", label: "Pending Payment" },
  { id: "recent", label: "Recent" },
];

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all");
  const [selected, setSelected] = useState<CustomerListRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CustomerListRow | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<CustomerListRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 200);

  const { data: customers, isInitialLoading, isRefreshing, refetch } = useCachedFetch<CustomerListRow[]>(
    "/api/customers?q=",
    { pollIntervalMs: 10_000, refetchOnFocus: true, ttlMs: 10_000 }
  );
  const { data: invoices } = useCachedFetch<Array<{ customerId?: string | null; paymentStatus: string; items?: Array<{ itemType: string; description?: string; packageEndDate?: string | null }> }>>(
    "/api/invoices"
  );
  const { data: dashboardMeta } = useCachedFetch<{ role?: "ADMIN" | "RECEPTIONIST" }>(
    "/api/dashboard"
  );
  const isAdmin = dashboardMeta?.role === "ADMIN";

  const invoiceIndex = useMemo(
    () => buildCustomerInvoiceIndex(invoices ?? []),
    [invoices]
  );

  const filtered = useMemo(
    () =>
      filterCustomers(customers ?? [], {
        search: debouncedSearch,
        quickFilter,
        serviceFilter,
        invoiceIndex,
      }),
    [customers, debouncedSearch, quickFilter, serviceFilter, invoiceIndex]
  );

  const handleCreated = () => {
    setFormOpen(false);
    setEditCustomer(null);
    toast.success("Customer saved");
    invalidateCachePrefix("/api/customers");
    invalidateCache("/api/invoices");
    void refetch();
  };

  const openEdit = (customer: CustomerListRow) => {
    setSelected(null);
    setEditCustomer(customer);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteCustomer) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${deleteCustomer.id}`, { method: "DELETE" });
      const result = await readApiResponse(res, "Failed to delete customer");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Customer deleted");
      setDeleteCustomer(null);
      invalidateCachePrefix("/api/customers");
      invalidateCache("/api/invoices");
      void refetch();
    } finally {
      setDeleting(false);
    }
  };

  if (isInitialLoading && !customers?.length) {
    return <ListPageSkeleton />;
  }

  return (
    <div className="mx-auto w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-10"
            placeholder="Search by name or mobile number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="lg" className="shrink-0" onClick={() => {
          setEditCustomer(null);
          setFormOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-center lg:justify-center lg:gap-6">
        <div className="flex flex-wrap justify-center gap-2">
          {QUICK_FILTERS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setQuickFilter(pill.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                quickFilter === pill.id
                  ? "nav-pill-active"
                  : "border border-border/60 bg-card/40 text-foreground/80 hover:bg-muted/40"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <ServiceFilterSelect value={serviceFilter} onChange={setServiceFilter} />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {filtered.length} customer{filtered.length === 1 ? "" : "s"}
        {isRefreshing ? " · updating…" : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="glass-panel rounded-[20px] px-6 py-16 text-center">
          <p className="text-sm font-medium text-foreground">No customers match your search.</p>
        </div>
      ) : (
        <CustomersTable
          customers={filtered}
          invoiceIndex={invoiceIndex}
          onViewDetails={setSelected}
          isAdmin={isAdmin}
          onDelete={(customer) => setDeleteCustomer(customer)}
        />
      )}

      <CustomerDrawer
        customer={selected}
        invoiceIndex={invoiceIndex}
        onClose={() => setSelected(null)}
        onEdit={openEdit}
      />

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditCustomer(null);
        }}
        onSuccess={handleCreated}
        initialData={
          editCustomer
            ? {
                id: editCustomer.id,
                name: editCustomer.name,
                mobile: editCustomer.mobile ?? "",
                status: editCustomer.status,
              }
            : undefined
        }
      />

      <Modal
        open={!!deleteCustomer}
        onClose={() => setDeleteCustomer(null)}
        title="Delete Customer"
        description="This action cannot be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteCustomer(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Delete <strong>{deleteCustomer?.name}</strong> from customers?
        </p>
      </Modal>
    </div>
  );
}
