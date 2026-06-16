"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { ListPageSkeleton } from "@/components/ui/skeletons";
import { invalidateCachePrefix } from "@/lib/client-cache";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { readApiResponse } from "@/lib/api-error";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { ExpensesTable, type ExpenseListRow } from "@/components/expenses/expenses-table";

type ExpenseListResponse = {
  items: ExpenseListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function buildExpensesQuery(filters: {
  q: string;
  fromDate: string;
  toDate: string;
  page: number;
}) {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  return `/api/expenses?${params.toString()}`;
}

export default function ExpensesPage() {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseListRow | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<ExpenseListRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 200);

  const listUrl = useMemo(
    () =>
      buildExpensesQuery({
        q: debouncedSearch,
        fromDate,
        toDate,
        page,
      }),
    [debouncedSearch, fromDate, toDate, page]
  );

  const { data, isInitialLoading, isRefreshing, refetch } = useCachedFetch<ExpenseListResponse>(
    listUrl,
    { pollIntervalMs: 10_000, refetchOnFocus: true, ttlMs: 10_000 }
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleSaved = () => {
    setFormOpen(false);
    setEditExpense(null);
    invalidateCachePrefix("/api/expenses");
    invalidateCachePrefix("/api/dashboard");
    invalidateCachePrefix("/api/reports");
    void refetch();
  };

  const openCreate = () => {
    setEditExpense(null);
    setFormOpen(true);
  };

  const openEdit = (expense: ExpenseListRow) => {
    setEditExpense(expense);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteExpense) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/expenses/${deleteExpense.id}`, { method: "DELETE" });
      const result = await readApiResponse(res, "Failed to delete expense");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Expense deleted");
      setDeleteExpense(null);
      invalidateCachePrefix("/api/expenses");
      invalidateCachePrefix("/api/dashboard");
      invalidateCachePrefix("/api/reports");
      void refetch();
    } finally {
      setDeleting(false);
    }
  };

  if (isInitialLoading && !data) {
    return <ListPageSkeleton />;
  }

  return (
    <div className="mx-auto w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Expenses</h2>
          <p className="text-sm text-muted-foreground">Track money going out of the business</p>
        </div>
        <Button size="lg" className="shrink-0" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <div className="glass-panel grid gap-4 rounded-[20px] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="expense-search">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="expense-search"
              className="h-11 pl-10"
              placeholder="Search paid to or reason..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense-from">From Date</Label>
          <Input
            id="expense-from"
            type="date"
            className="h-11"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense-to">To Date</Label>
          <Input
            id="expense-to"
            type="date"
            className="h-11"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {total} expense{total === 1 ? "" : "s"}
        {isRefreshing ? " · updating…" : ""}
      </p>

      {items.length === 0 ? (
        <div className="glass-panel rounded-[20px] px-6 py-16 text-center">
          <p className="text-sm font-medium text-foreground">No expenses match your filters.</p>
        </div>
      ) : (
        <ExpensesTable expenses={items} onEdit={openEdit} />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditExpense(null);
        }}
        onSuccess={handleSaved}
        onDelete={
          editExpense
            ? () => {
                setDeleteExpense(editExpense);
                setFormOpen(false);
              }
            : undefined
        }
        initialData={
          editExpense
            ? {
                id: editExpense.id,
                expenseDate: editExpense.expenseDate,
                paidTo: editExpense.paidTo,
                reason: editExpense.reason,
                amount: editExpense.amount,
                paymentMode: editExpense.paymentMode ?? "CASH",
              }
            : undefined
        }
      />

      <Modal
        open={!!deleteExpense}
        onClose={() => setDeleteExpense(null)}
        title="Delete Expense"
        description="This action cannot be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteExpense(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Delete expense for <strong>{deleteExpense?.paidTo}</strong> ({deleteExpense?.reason})?
        </p>
      </Modal>
    </div>
  );
}
