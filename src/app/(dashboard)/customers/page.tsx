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
  getCustomerCountLabel,
  type CustomerListRow,
  type ServiceFilter,
  type StatusFilter,
} from "@/lib/customer-list-utils";

type CustomerDirectoryView = "active" | "deleted";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All Customers" },
  { id: "active", label: "Active" },
  { id: "passed_out", label: "Passed Out" },
  { id: "pending_payment", label: "Pending Payment" },
];

export default function CustomersPage() {
  const [directoryView, setDirectoryView] = useState<CustomerDirectoryView>("active");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all");
  const [selected, setSelected] = useState<CustomerListRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CustomerListRow | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<CustomerListRow | null>(null);
  const [restoreCustomer, setRestoreCustomer] = useState<CustomerListRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 200);

  const customersListUrl =
    directoryView === "deleted"
      ? "/api/customers?q=&view=deleted"
      : "/api/customers?q=&view=active";

  const { data: customers, isInitialLoading, isRefreshing, refetch } = useCachedFetch<CustomerListRow[]>(
    customersListUrl,
    { pollIntervalMs: 10_000, refetchOnFocus: true, ttlMs: 10_000 }
  );
  const { data: invoices } = useCachedFetch<Array<{ customerId?: string | null; paymentStatus: string; items?: Array<{ itemType: string; description?: string; packageEndDate?: string | null }> }>>(
    "/api/invoices"
  );
  const { data: categories } = useCachedFetch<
    Array<{ id: string; name: string; isActive: boolean }>
  >("/api/catalog/subscriptions");
  const { data: dashboardMeta } = useCachedFetch<{ role?: "ADMIN" | "RECEPTIONIST" }>(
    "/api/dashboard"
  );
  const isAdmin = dashboardMeta?.role === "ADMIN";

  const subscriptionOptions = useMemo(() => {
    const rows = categories ?? [];
    return rows
      .filter((row) => row.isActive)
      .map((row) => ({ id: row.id, name: row.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const invoiceIndex = useMemo(
    () => buildCustomerInvoiceIndex(invoices ?? []),
    [invoices]
  );

  const filtered = useMemo(() => {
    const rows = customers ?? [];
    if (directoryView === "deleted") {
      const q = debouncedSearch.trim().toLowerCase();
      if (!q) return rows;
      return rows.filter(
        (customer) =>
          customer.name.toLowerCase().includes(q) || (customer.mobile ?? "").includes(q)
      );
    }
    return filterCustomers(rows, {
      search: debouncedSearch,
      statusFilter,
      serviceFilter,
      invoiceIndex,
    });
  }, [customers, debouncedSearch, statusFilter, serviceFilter, invoiceIndex, directoryView]);

  const countLabel = useMemo(() => {
    if (directoryView === "deleted") {
      const count = filtered.length;
      return `${count} deleted customer${count === 1 ? "" : "s"}`;
    }
    return getCustomerCountLabel({
      count: filtered.length,
      statusFilter,
      serviceFilter,
      search: debouncedSearch,
    });
  }, [filtered.length, statusFilter, serviceFilter, debouncedSearch, directoryView]);

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

  const handleRestore = async () => {
    if (!restoreCustomer) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/customers/${restoreCustomer.id}/restore`, {
        method: "POST",
      });
      const result = await readApiResponse(res, "Failed to restore customer");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Customer restored");
      setRestoreCustomer(null);
      invalidateCachePrefix("/api/customers");
      invalidateCache("/api/invoices");
      void refetch();
    } finally {
      setRestoring(false);
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
        {directoryView === "active" && (
          <Button
            size="lg"
            className="shrink-0"
            onClick={() => {
              setEditCustomer(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        )}
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
              Active Customers
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
              Deleted Customers
            </button>
          </div>
        </div>
      )}

      {directoryView === "active" && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-2">
            {STATUS_FILTERS.map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                  statusFilter === pill.id
                    ? "nav-pill-active"
                    : "border border-border/60 bg-card/40 text-foreground/80 hover:bg-muted/40"
                )}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <ServiceFilterSelect
            value={serviceFilter}
            onChange={setServiceFilter}
            subscriptions={subscriptionOptions}
          />
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {countLabel}
        {isRefreshing ? " · updating…" : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="glass-panel rounded-[20px] px-6 py-16 text-center">
          <p className="text-sm font-medium text-foreground">
            {directoryView === "deleted"
              ? "No deleted customers match your search."
              : "No customers match your search."}
          </p>
        </div>
      ) : (
        <CustomersTable
          customers={filtered}
          invoiceIndex={invoiceIndex}
          onViewDetails={setSelected}
          isAdmin={isAdmin}
          view={directoryView}
          onDelete={(customer) => setDeleteCustomer(customer)}
          onRestore={(customer) => setRestoreCustomer(customer)}
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

      <Modal
        open={!!restoreCustomer}
        onClose={() => setRestoreCustomer(null)}
        title="Restore Customer"
        description="This customer will reappear in the active directory."
        footer={
          <>
            <Button variant="outline" onClick={() => setRestoreCustomer(null)}>
              Cancel
            </Button>
            <Button disabled={restoring} onClick={handleRestore}>
              {restoring ? "Restoring…" : "Restore"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Restore <strong>{restoreCustomer?.name}</strong> to active customers?
        </p>
      </Modal>
    </div>
  );
}
