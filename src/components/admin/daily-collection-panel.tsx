"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, CheckCircle2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateInput, cn } from "@/lib/utils";
import { readApiResponse } from "@/lib/api-error";
import type { CollectionHistoryRow, DailyCollectionSheet } from "@/lib/daily-collection";

const glassCard = cn("glass-panel overflow-hidden");

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function BreakdownTable({
  rows,
  totalLabel,
  total,
  showQuantity,
}: {
  rows: Array<{ name: string; amount: number; quantity?: number }>;
  totalLabel: string;
  total: number;
  showQuantity?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No records for this date.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="font-semibold">Item</TableHead>
            {showQuantity && <TableHead className="text-right font-semibold">Qty</TableHead>}
            <TableHead className="text-right font-semibold">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="font-medium">{row.name}</TableCell>
              {showQuantity && (
                <TableCell className="text-right tabular-nums">{row.quantity ?? 0} sold</TableCell>
              )}
              <TableCell className="text-right font-semibold tabular-nums">
                {formatCurrency(row.amount)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/20 font-semibold">
            <TableCell colSpan={showQuantity ? 2 : 1}>{totalLabel}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCurrency(total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function ExpenseRows({ expenses }: { expenses: DailyCollectionSheet["expenses"] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (expenses.length === 0) {
    return <p className="text-sm text-muted-foreground">No expenses for this date.</p>;
  }

  const total = expenses.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="space-y-2">
      {expenses.map((expense) => {
        const open = expandedId === expense.id;
        return (
          <div key={expense.id} className="rounded-lg border border-border/60 bg-card/40">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              onClick={() => setExpandedId(open ? null : expense.id)}
            >
              <div>
                <p className="font-medium">{expense.reason}</p>
                <p className="text-sm text-muted-foreground">Paid to {expense.paidTo}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tabular-nums">{formatCurrency(expense.amount)}</span>
                {open ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>
            {open && (
              <div className="border-t border-border/60 px-4 py-3 text-sm">
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Date</dt>
                    <dd className="font-medium">{formatDate(expense.expenseDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Paid To</dt>
                    <dd className="font-medium">{expense.paidTo}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Reason</dt>
                    <dd className="font-medium">{expense.reason}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Amount</dt>
                    <dd className="font-medium">{formatCurrency(expense.amount)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Created By</dt>
                    <dd className="font-medium">{expense.createdBy}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Created Time</dt>
                    <dd className="font-medium">{formatDateTime(expense.createdAt)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        );
      })}
      <div className="flex justify-between rounded-lg bg-muted/30 px-4 py-3 font-semibold">
        <span>Total Expenses</span>
        <span className="tabular-nums">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

function CollectionHistoryTable({
  rows,
  onSelectDate,
}: {
  rows: CollectionHistoryRow[];
  onSelectDate: (date: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="text-right font-semibold">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.date}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell>
                {row.collected ? (
                  <Badge variant="success">Collected ✓</Badge>
                ) : (
                  <Badge variant="secondary">Not Collected</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onSelectDate(row.date)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function DailyCollectionPanel() {
  const [selectedDate, setSelectedDate] = useState(formatDateInput(new Date()));
  const [sheet, setSheet] = useState<DailyCollectionSheet | null>(null);
  const [notes, setNotes] = useState("");
  const [collectionConfirmed, setCollectionConfirmed] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isToday = selectedDate === formatDateInput(new Date());

  const loadSheet = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/daily-collection?date=${date}`);
      const result = await readApiResponse<DailyCollectionSheet>(res, "Failed to load collection");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSheet(result.data);
      setNotes(result.data.collection?.notes ?? "");
      setCollectionConfirmed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCollectionConfirmed(false);
    void loadSheet(selectedDate);
  }, [selectedDate, loadSheet]);

  const handleMarkCollected = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/daily-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, notes }),
      });
      const result = await readApiResponse(res, "Failed to mark collection");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Collection marked successfully");
      await loadSheet(selectedDate);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/daily-collection", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, notes }),
      });
      const result = await readApiResponse(res, "Failed to update notes");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Notes updated");
      await loadSheet(selectedDate);
    } finally {
      setSaving(false);
    }
  };

  const subscriptionTotal = sheet?.subscriptionBreakdown.reduce((s, r) => s + r.amount, 0) ?? 0;
  const productTotal = sheet?.productBreakdown.reduce((s, r) => s + r.amount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <Card className={glassCard}>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Label htmlFor="collection-date">Collection Date</Label>
            <div className="flex items-center gap-2">
              <Input
                id="collection-date"
                type="date"
                className="h-11 w-full sm:w-56"
                value={selectedDate}
                max={formatDateInput(new Date())}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0"
                aria-label="View collection history"
                disabled={loading || !sheet}
                onClick={() => setHistoryOpen(true)}
              >
                <Calendar className="h-5 w-5" />
              </Button>
            </div>
          </div>
          {sheet?.collection ? (
            <Badge variant="success" className="h-8 px-3 text-sm">
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Collected
            </Badge>
          ) : (
            <Badge variant="warning" className="h-8 px-3 text-sm">
              Not Collected
            </Badge>
          )}
        </CardContent>
      </Card>

      {loading || !sheet ? (
        <div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading daily collection…
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Total Revenue", value: sheet.totalRevenue, highlight: false },
              { label: "Total Expenses", value: sheet.totalExpenses, highlight: false },
              { label: "Cash Collected", value: sheet.paymentBreakdown.cash, highlight: false },
              { label: "PhonePe Collected", value: sheet.paymentBreakdown.upi, highlight: false },
              { label: "Net Amount", value: sheet.netAmount, highlight: true },
            ].map((kpi) => (
              <Card
                key={kpi.label}
                className={cn(glassCard, kpi.highlight && "ring-2 ring-primary/30")}
              >
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p
                    className={cn(
                      "mt-1 text-2xl font-bold tabular-nums",
                      kpi.highlight && "text-primary"
                    )}
                  >
                    {formatCurrency(kpi.value)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className={glassCard}>
              <CardHeader className="border-b border-border px-5 py-4">
                <CardTitle className="text-base">Revenue Earned</CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                <BreakdownTable
                  rows={sheet.subscriptionBreakdown}
                  totalLabel="Total Revenue"
                  total={subscriptionTotal}
                />
              </CardContent>
            </Card>

            <Card className={glassCard}>
              <CardHeader className="border-b border-border px-5 py-4">
                <CardTitle className="text-base">Product Sales</CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                <BreakdownTable
                  rows={sheet.productBreakdown}
                  totalLabel="Total Product Revenue"
                  total={productTotal}
                  showQuantity
                />
              </CardContent>
            </Card>
          </div>

          <Card className={glassCard}>
            <CardHeader className="border-b border-border px-5 py-4">
              <CardTitle className="text-base">Expenses Given</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <ExpenseRows expenses={sheet.expenses} />
            </CardContent>
          </Card>

          <Card className={glassCard}>
            <CardHeader className="border-b border-border px-5 py-4">
              <CardTitle className="text-base">Payment Mode Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-card/40 p-4">
                <p className="text-sm text-muted-foreground">Cash Collected</p>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {formatCurrency(sheet.paymentBreakdown.cash)}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/40 p-4">
                <p className="text-sm text-muted-foreground">PhonePe / UPI Collected</p>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {formatCurrency(sheet.paymentBreakdown.upi)}
                </p>
              </div>
              {sheet.paymentBreakdown.card > 0 && (
                <div className="rounded-lg border border-border/60 bg-card/40 p-4">
                  <p className="text-sm text-muted-foreground">Card Collected</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">
                    {formatCurrency(sheet.paymentBreakdown.card)}
                  </p>
                </div>
              )}
              {sheet.paymentBreakdown.other > 0 && (
                <div className="rounded-lg border border-border/60 bg-card/40 p-4">
                  <p className="text-sm text-muted-foreground">Other Collected</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">
                    {formatCurrency(sheet.paymentBreakdown.other)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={glassCard}>
            <CardHeader className="border-b border-border px-5 py-4">
              <CardTitle className="text-base">Owner Collection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {sheet.collection ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <p className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    Collected Successfully
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Collected At: {formatDateTime(sheet.collection.collectedAt)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Collected By: {sheet.collection.collectedBy.name}
                  </p>
                </div>
              ) : null}

              {!sheet.collection && (
                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium">Collection Status</legend>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-4 py-3">
                    <input
                      type="radio"
                      name="collection-status"
                      className="h-4 w-4 accent-primary"
                      checked={!collectionConfirmed}
                      onChange={() => setCollectionConfirmed(false)}
                    />
                    <span className="text-sm">Not Collected</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-4 py-3">
                    <input
                      type="radio"
                      name="collection-status"
                      className="h-4 w-4 accent-primary"
                      checked={collectionConfirmed}
                      onChange={() => setCollectionConfirmed(true)}
                    />
                    <span className="text-sm font-medium">Collected</span>
                  </label>
                </fieldset>
              )}

              <div className="space-y-2">
                <Label htmlFor="collection-notes">Collected Notes</Label>
                <Textarea
                  id="collection-notes"
                  rows={4}
                  placeholder="Collected all cash and verified PhonePe settlement."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {sheet.collection ? (
                <Button onClick={handleSaveNotes} disabled={saving}>
                  {saving ? "Saving…" : "Save Notes"}
                </Button>
              ) : (
                <Button
                  onClick={handleMarkCollected}
                  disabled={saving || !collectionConfirmed}
                >
                  {saving
                    ? "Saving…"
                    : isToday
                      ? "Mark Today's Collection as Collected"
                      : "Mark Collection as Collected"}
                </Button>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {sheet && (
        <Modal
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          title="Collection History"
          description="Recent days — collected or not collected"
          maxWidth="lg"
        >
          <CollectionHistoryTable
            rows={sheet.recentHistory}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setHistoryOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
