"use client";

import { PrefetchLink } from "@/components/ui/prefetch-link";
import { Eye, FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/skeletons";

export interface StockListRow {
  id: string;
  stockNumber: string;
  itemName: string;
  category: string;
  quantityPurchased: number;
  supplierName: string;
  purchaseDate: string;
  totalCost: number;
  billPdfUrl?: string | null;
  billFileName?: string | null;
  createdBy?: { username: string; name: string };
}

export function StockTable({
  rows,
  loading,
  showCreatedBy,
}: {
  rows: StockListRow[];
  loading?: boolean;
  showCreatedBy?: boolean;
}) {
  if (loading) {
    return <TableSkeleton rows={6} cols={showCreatedBy ? 7 : 6} />;
  }

  if (rows.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No stock entries match your filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Stock No</TableHead>
            <TableHead>Item Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Purchase Date</TableHead>
            <TableHead className="text-right">Total Cost</TableHead>
            {showCreatedBy && <TableHead>Created By</TableHead>}
            <TableHead>Bill</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="glass-row border-0">
              <TableCell className="font-mono text-xs font-semibold">{row.stockNumber}</TableCell>
              <TableCell className="font-medium">{row.itemName}</TableCell>
              <TableCell>{row.category}</TableCell>
              <TableCell className="text-right tabular-nums">{row.quantityPurchased}</TableCell>
              <TableCell>{row.supplierName}</TableCell>
              <TableCell>{formatDate(row.purchaseDate)}</TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {formatCurrency(row.totalCost)}
              </TableCell>
              {showCreatedBy && (
                <TableCell className="text-sm text-muted-foreground">
                  {row.createdBy?.username ?? "—"}
                </TableCell>
              )}
              <TableCell>
                {row.billPdfUrl ? (
                  <FileText className="h-4 w-4 text-primary" aria-label="Bill attached" />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <PrefetchLink href={`/stock/${row.id}`} title="View details">
                      <Eye className="h-4 w-4" />
                    </PrefetchLink>
                  </Button>
                  {row.billPdfUrl && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a
                        href={`/api/stock/${row.id}/bill?disposition=attachment`}
                        title="Download bill PDF"
                      >
                        <FileDown className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
