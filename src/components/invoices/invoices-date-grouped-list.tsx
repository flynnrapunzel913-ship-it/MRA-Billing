"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataRowCard } from "@/components/ui/data-row-card";
import { formatCurrency } from "@/lib/utils";
import { paymentStatusLabel, paymentStatusBadgeVariant } from "@/lib/constants";
import {
  formatInvoiceItems,
  groupInvoicesByDate,
  type InvoiceListRow,
} from "@/lib/invoice-list-utils";

type InvoicesDateGroupedListProps = {
  invoices: InvoiceListRow[];
  isDeletedView?: boolean;
  onDelete?: (invoice: InvoiceListRow) => void;
  canDelete?: (invoice: InvoiceListRow) => boolean;
  onRestore?: (invoice: InvoiceListRow) => void;
};

export function InvoicesDateGroupedList({
  invoices,
  isDeletedView = false,
  onDelete,
  canDelete,
  onRestore,
}: InvoicesDateGroupedListProps) {
  const dateGroups = groupInvoicesByDate(invoices);

  return (
    <div className="space-y-5">
      {dateGroups.map((group) => (
        <section key={group.dateKey} className="space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <h3 className="text-sm font-semibold">{group.dateLabel}</h3>
            <span className="text-xs text-muted-foreground">
              {group.invoices.length} invoice{group.invoices.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="space-y-3">
            {group.invoices.map((invoice) => (
              <DataRowCard key={invoice.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    {isDeletedView ? (
                      <p className="text-base font-semibold text-foreground">
                        {invoice.invoiceNumber}
                      </p>
                    ) : (
                      <PrefetchLink
                        href={`/invoices/${invoice.id}`}
                        className="text-base font-semibold text-primary hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </PrefetchLink>
                    )}
                    <p className="text-sm text-foreground/90">{invoice.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatInvoiceItems(invoice.items)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(Number(invoice.grandTotal))}
                    </p>
                    <Badge variant={paymentStatusBadgeVariant(invoice.paymentStatus)}>
                      {paymentStatusLabel(invoice.paymentStatus)}
                    </Badge>
                    <div className="flex gap-1">
                      {!isDeletedView && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={`/api/invoices/${invoice.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            PDF
                          </a>
                        </Button>
                      )}
                      {!isDeletedView &&
                      onDelete &&
                      (!canDelete || canDelete(invoice)) ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-destructive"
                          onClick={() => onDelete(invoice)}
                          aria-label={`Delete ${invoice.invoiceNumber}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {isDeletedView && onRestore && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onRestore(invoice)}
                        >
                          <RotateCcw className="mr-1.5 h-4 w-4" />
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </DataRowCard>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
