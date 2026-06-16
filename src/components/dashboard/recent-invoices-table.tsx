"use client";

import { Fragment } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, cn } from "@/lib/utils";
import { paymentStatusLabel, paymentStatusBadgeVariant } from "@/lib/constants";
import {
  formatInvoiceItems,
  groupInvoicesByDate,
  type RecentInvoiceRow,
} from "@/lib/recent-invoices-utils";

type RecentInvoicesTableProps = {
  invoices: RecentInvoiceRow[];
  showAmount?: boolean;
  showDelete?: boolean;
  onDelete?: (invoice: RecentInvoiceRow) => void;
};

export function RecentInvoicesTable({
  invoices,
  showAmount = false,
  showDelete = false,
  onDelete,
}: RecentInvoicesTableProps) {
  const dateGroups = groupInvoicesByDate(invoices);
  const colCount = showAmount ? 6 : 5;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="font-semibold">Invoice No</TableHead>
            <TableHead className="font-semibold">Student</TableHead>
            <TableHead className="font-semibold">Subscription / Product</TableHead>
            {showAmount && (
              <TableHead className="text-right font-semibold">Amount</TableHead>
            )}
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dateGroups.map((group) => (
            <Fragment key={group.dateKey}>
              <TableRow
                className="bg-muted/40 hover:bg-muted/40"
              >
                <TableCell colSpan={colCount} className="py-2.5 font-semibold">
                  {group.dateLabel}
                </TableCell>
              </TableRow>
              {group.invoices.map((invoice, index) => (
                <TableRow
                  key={invoice.id}
                  className={cn(
                    "transition-colors hover:bg-muted/30",
                    index % 2 === 1 && "bg-muted/20"
                  )}
                >
                  <TableCell>
                    <PrefetchLink
                      href={`/invoices/${invoice.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {invoice.invoiceNumber}
                    </PrefetchLink>
                  </TableCell>
                  <TableCell className="font-medium">{invoice.customerName}</TableCell>
                  <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                    {formatInvoiceItems(invoice.items)}
                  </TableCell>
                  {showAmount && (
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrency(Number(invoice.grandTotal ?? 0))}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant={paymentStatusBadgeVariant(invoice.paymentStatus)}>
                      {paymentStatusLabel(invoice.paymentStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" className="h-8" asChild>
                        <a
                          href={`/api/invoices/${invoice.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          PDF
                        </a>
                      </Button>
                      {showDelete && onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => onDelete(invoice)}
                          aria-label={`Delete ${invoice.invoiceNumber}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
