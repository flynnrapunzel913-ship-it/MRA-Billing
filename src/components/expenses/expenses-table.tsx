"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

export type ExpenseListRow = {
  id: string;
  expenseDate: string;
  paidTo: string;
  reason: string;
  amount: number;
  createdBy?: { id: string; name: string; username: string };
};

interface ExpensesTableProps {
  expenses: ExpenseListRow[];
  onEdit: (expense: ExpenseListRow) => void;
}

export function ExpensesTable({ expenses, onEdit }: ExpensesTableProps) {
  return (
    <div className="glass-panel overflow-hidden rounded-[20px]">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Paid To</TableHead>
              <TableHead className="font-semibold">Reason</TableHead>
              <TableHead className="font-semibold text-right">Amount</TableHead>
              <TableHead className="font-semibold">Created By</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense, index) => (
              <TableRow key={expense.id} className={cn(index % 2 === 1 && "bg-muted/20")}>
                <TableCell className="text-muted-foreground">
                  {formatDate(expense.expenseDate)}
                </TableCell>
                <TableCell className="font-medium">{expense.paidTo}</TableCell>
                <TableCell>{expense.reason}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCurrency(expense.amount)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {expense.createdBy?.name || expense.createdBy?.username || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" className="h-8" onClick={() => onEdit(expense)}>
                    View/Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
