"use client";

import { Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  getDisplayStatus,
  type CustomerListRow,
  type InvoiceIndexEntry,
} from "@/lib/customer-list-utils";

interface CustomersTableProps {
  customers: CustomerListRow[];
  invoiceIndex: Map<string, InvoiceIndexEntry>;
  onViewDetails: (customer: CustomerListRow) => void;
  isAdmin?: boolean;
  onDelete?: (customer: CustomerListRow) => void;
}

export function CustomersTable({
  customers,
  invoiceIndex,
  onViewDetails,
  isAdmin = false,
  onDelete,
}: CustomersTableProps) {
  return (
    <div className="glass-panel overflow-hidden rounded-[20px]">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="h-10 px-4 text-xs font-semibold uppercase tracking-wide">
              Name
            </TableHead>
            <TableHead className="h-10 px-4 text-xs font-semibold uppercase tracking-wide">
              Mobile Number
            </TableHead>
            <TableHead className="h-10 px-4 text-xs font-semibold uppercase tracking-wide">
              Status
            </TableHead>
            <TableHead className="h-10 px-4 text-right text-xs font-semibold uppercase tracking-wide">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer, index) => {
            const display = getDisplayStatus(customer, invoiceIndex.get(customer.id));
            return (
              <TableRow
                key={customer.id}
                className={cn("border-border/60", index % 2 === 1 && "bg-muted/15")}
              >
                <TableCell className="px-4 py-3 font-semibold text-foreground">
                  {customer.name}
                </TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">
                  {customer.mobile || "—"}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Badge variant={display.variant}>{display.label}</Badge>
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => onViewDetails(customer)}
                    >
                      View Details
                    </Button>
                    {isAdmin && onDelete && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => onDelete(customer)}
                        aria-label={`Delete ${customer.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
