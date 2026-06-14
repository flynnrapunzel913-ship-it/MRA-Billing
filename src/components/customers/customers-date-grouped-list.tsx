"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataRowCard } from "@/components/ui/data-row-card";
import {
  getDisplayStatus,
  groupCustomersByDate,
  type CustomerListRow,
  type InvoiceIndexEntry,
} from "@/lib/customer-list-utils";

export type CustomersDateGroupedListView = "active" | "deleted";

interface CustomersDateGroupedListProps {
  customers: CustomerListRow[];
  invoiceIndex: Map<string, InvoiceIndexEntry>;
  onViewDetails: (customer: CustomerListRow) => void;
  isAdmin?: boolean;
  view?: CustomersDateGroupedListView;
  onDelete?: (customer: CustomerListRow) => void;
  onRestore?: (customer: CustomerListRow) => void;
}

export function CustomersDateGroupedList({
  customers,
  invoiceIndex,
  onViewDetails,
  isAdmin = false,
  view = "active",
  onDelete,
  onRestore,
}: CustomersDateGroupedListProps) {
  const isDeletedView = view === "deleted";
  const dateGroups = groupCustomersByDate(customers);

  return (
    <div className="space-y-5">
      {dateGroups.map((group) => (
        <section key={group.dateKey} className="space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <h3 className="text-sm font-semibold">{group.dateLabel}</h3>
            <span className="text-xs text-muted-foreground">
              {group.customers.length} customer{group.customers.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="space-y-2">
            {group.customers.map((customer) => {
              const display = isDeletedView
                ? { label: "Deleted", variant: "secondary" as const }
                : getDisplayStatus(customer, invoiceIndex.get(customer.id));

              return (
                <DataRowCard key={customer.id} className="px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <span className="shrink-0 text-sm font-semibold text-foreground sm:text-base">
                      {customer.name}
                    </span>
                    <span className="hidden h-3 w-px shrink-0 bg-border/60 sm:block" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground sm:text-sm">
                      <span className="text-foreground/85">{customer.mobile || "—"}</span>
                      {customer.membershipId ? (
                        <>
                          <span className="mx-1.5 text-muted-foreground/50">·</span>
                          <span className="font-mono">{customer.membershipId}</span>
                        </>
                      ) : null}
                    </span>
                    <Badge variant={display.variant} className="shrink-0 text-[10px] sm:text-xs">
                      {display.label}
                    </Badge>
                    {!isDeletedView && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 px-2 text-xs sm:h-8 sm:px-3"
                        onClick={() => onViewDetails(customer)}
                      >
                        View
                      </Button>
                    )}
                    {isAdmin && !isDeletedView && onDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive sm:h-8 sm:w-8"
                        onClick={() => onDelete(customer)}
                        aria-label={`Delete ${customer.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    )}
                    {isAdmin && isDeletedView && onRestore && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 px-2 text-xs sm:h-8 sm:px-3"
                        onClick={() => onRestore(customer)}
                      >
                        <RotateCcw className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Restore
                      </Button>
                    )}
                  </div>
                </DataRowCard>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
