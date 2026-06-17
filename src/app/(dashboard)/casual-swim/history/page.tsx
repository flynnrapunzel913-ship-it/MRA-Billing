"use client";

import { useState } from "react";
import { Eye, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { invalidateCache } from "@/lib/client-cache";
import { readApiResponse } from "@/lib/api-error";
import { formatCurrency } from "@/lib/utils";
import type { CasualSwimBillDto } from "@/lib/casual-swim-bill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Modal } from "@/components/ui/modal";
import { CasualSwimReceiptActions } from "@/components/casual-swim/casual-swim-receipt-actions";

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return {
    date: new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date),
  };
}

export default function CasualSwimHistoryPage() {
  const { data, isInitialLoading, refetch } = useCachedFetch<{ bills: CasualSwimBillDto[] }>(
    "/api/casual-swim/bills/history"
  );
  const [viewBill, setViewBill] = useState<CasualSwimBillDto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const bills = data?.bills ?? [];

  const deleteTicket = async (bill: CasualSwimBillDto) => {
    if (!confirm(`Delete ticket #${bill.ticketNumber}? This cannot be undone.`)) return;
    setDeletingId(bill.id);
    try {
      const res = await fetch(`/api/casual-swim/bills/${bill.id}`, { method: "DELETE" });
      const result = await readApiResponse(res, "Failed to delete ticket");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Ticket #${bill.ticketNumber} deleted`);
      invalidateCache("/api/casual-swim/bills/history");
      invalidateCache("/api/casual-swim/bills");
      invalidateCache("/api/admin/casual-swim/reset-counter");
      void refetch();
    } finally {
      setDeletingId(null);
    }
  };

  if (isInitialLoading && !data) {
    return <PageSkeleton className="max-w-6xl" />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Ticket History</h1>
        <p className="text-sm text-muted-foreground">All casual swim tickets — view, print, or delete</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((bill) => {
                    const { date, time } = formatDateTime(bill.createdAt);
                    return (
                      <TableRow key={bill.id}>
                        <TableCell className="font-semibold tabular-nums">
                          #{bill.ticketNumber}
                        </TableCell>
                        <TableCell>{date}</TableCell>
                        <TableCell>{time}</TableCell>
                        <TableCell>{bill.createdBy}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(bill.totalAmount)}
                        </TableCell>
                        <TableCell>{bill.status}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title="View"
                              onClick={() => setViewBill(bill)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" title="Print" asChild>
                              <a
                                href={`/casual-swim/receipt/${bill.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Printer className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title="Delete"
                              disabled={deletingId === bill.id}
                              onClick={() => deleteTicket(bill)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={!!viewBill}
        onClose={() => setViewBill(null)}
        title={viewBill ? `Ticket #${viewBill.ticketNumber}` : "Ticket"}
        maxWidth="md"
      >
        {viewBill && <CasualSwimReceiptActions bill={viewBill} />}
      </Modal>
    </div>
  );
}
