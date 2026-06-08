"use client";

import Link from "next/link";
import { RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { paymentStatusLabel, paymentStatusBadgeVariant } from "@/lib/constants";
import type { InvoiceListRow } from "@/lib/invoice-list-utils";

export type InvoicesHistoryTableView = "active" | "deleted";

interface InvoicesHistoryTableProps {
  invoices: InvoiceListRow[];
  view?: InvoicesHistoryTableView;
  onDelete?: (invoice: InvoiceListRow) => void;
  canDelete?: (invoice: InvoiceListRow) => boolean;
  onRestore?: (invoice: InvoiceListRow) => void;
}

export function InvoicesHistoryTable({
  invoices,
  view = "active",
  onDelete,
  canDelete,
  onRestore,
}: InvoicesHistoryTableProps) {
  const isDeletedView = view === "deleted";
  return (
    <div className="glass-panel overflow-hidden rounded-[20px]">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="h-10 px-3 text-xs font-semibold uppercase tracking-wide">
              Invoice No
            </TableHead>
            <TableHead className="h-10 px-3 text-xs font-semibold uppercase tracking-wide">
              Customer
            </TableHead>
            <TableHead className="hidden h-10 px-3 text-xs font-semibold uppercase tracking-wide sm:table-cell">
              Date
            </TableHead>
            <TableHead className="h-10 px-3 text-right text-xs font-semibold uppercase tracking-wide">
              Amount
            </TableHead>
            <TableHead className="h-10 px-3 text-xs font-semibold uppercase tracking-wide">
              Status
            </TableHead>
            <TableHead className="h-10 px-3 text-right text-xs font-semibold uppercase tracking-wide">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice, index) => (
            <TableRow
              key={invoice.id}
              className={cn("border-border/60", index % 2 === 1 && "bg-muted/15")}
            >
              <TableCell className="px-3 py-2.5">
                {isDeletedView ? (
                  <span className="font-semibold text-foreground">{invoice.invoiceNumber}</span>
                ) : (
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                )}
              </TableCell>
              <TableCell className="max-w-[10rem] truncate px-3 py-2.5 text-sm">
                {invoice.customerName}
              </TableCell>
              <TableCell className="hidden px-3 py-2.5 text-muted-foreground sm:table-cell">
                {formatDate(invoice.invoiceDate)}
              </TableCell>
              <TableCell className="px-3 py-2.5 text-right font-semibold tabular-nums">
                {formatCurrency(Number(invoice.grandTotal))}
              </TableCell>
              <TableCell className="px-3 py-2.5">
                <Badge variant={paymentStatusBadgeVariant(invoice.paymentStatus)}>
                  {paymentStatusLabel(invoice.paymentStatus)}
                </Badge>
              </TableCell>
              <TableCell className="px-3 py-2.5">
                <div className="flex justify-end gap-1">
                  {!isDeletedView && (
                    <Button variant="outline" size="sm" className="h-8" asChild>
                      <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                        PDF
                      </a>
                    </Button>
                  )}
                  {!isDeletedView && onDelete && (!canDelete || canDelete(invoice)) ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(invoice)}
                      aria-label={`Delete ${invoice.invoiceNumber}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {isDeletedView && onRestore ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => onRestore(invoice)}
                    >
                      <RotateCcw className="mr-1.5 h-4 w-4" />
                      Restore
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
