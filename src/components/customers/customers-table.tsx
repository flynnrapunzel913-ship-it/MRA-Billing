"use client";

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
}

export function CustomersTable({
  customers,
  invoiceIndex,
  onViewDetails,
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => onViewDetails(customer)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
