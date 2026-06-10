"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
} from "lucide-react";
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
import { formatCurrency, formatDateInput, cn } from "@/lib/utils";
import { readApiResponse } from "@/lib/api-error";
import type { CollectionHistoryRow, DailyCollectionSheet } from "@/lib/daily-collection";
import {
  CashDenominationSection,
  cashStateFromReconciliation,
  emptyCashState,
} from "@/components/admin/cash-denomination-section";
import { formatCashDifference, type CashDenominations } from "@/lib/cash-denominations";

const sectionCard = cn("glass-panel overflow-hidden");
const summaryCard = "rounded-xl border border-border/60 bg-card/50 p-4 sm:p-5";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

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

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function SummaryKpi({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={cn(summaryCard, highlight && "border-primary/40 bg-primary/5 ring-1 ring-primary/20")}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          highlight && "text-primary"
        )}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function RevenueBreakdownTable({ sheet }: { sheet: DailyCollectionSheet }) {
  const rows = sheet.revenueBreakdown;
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No revenue recorded for this date.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="font-semibold">Source</TableHead>
            <TableHead className="text-right font-semibold">Count</TableHead>
            <TableHead className="text-right font-semibold">Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-right tabular-nums">{row.count}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatCurrency(row.amount)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/20 font-semibold">
            <TableCell>Total</TableCell>
            <TableCell className="text-right">—</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(sheet.totalRevenue)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function ExpenseTable({ expenses }: { expenses: DailyCollectionSheet["expenses"] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (expenses.length === 0) {
    return <p className="text-sm text-muted-foreground">No expenses for this date.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-8" />
            <TableHead className="font-semibold">Time</TableHead>
            <TableHead className="font-semibold">To Whom</TableHead>
            <TableHead className="font-semibold">Reason</TableHead>
            <TableHead className="text-right font-semibold">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => {
            const open = expandedId === expense.id;
            return (
              <Fragment key={expense.id}>
                <TableRow className="cursor-pointer" onClick={() => setExpandedId(open ? null : expense.id)}>
                  <TableCell>
                    {open ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatTime(expense.createdAt)}</TableCell>
                  <TableCell>{expense.paidTo}</TableCell>
                  <TableCell>{expense.reason}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                </TableRow>
                {open && (
                  <TableRow className="bg-muted/10">
                    <TableCell colSpan={5} className="py-3">
                      <dl className="grid gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="text-muted-foreground">Created By</dt>
                          <dd className="font-medium">{expense.createdBy}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Created Time</dt>
                          <dd className="font-medium">{formatDateTime(expense.createdAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Notes</dt>
                          <dd className="font-medium text-muted-foreground">—</dd>
                        </div>
                      </dl>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function OutstandingTable({ sheet }: { sheet: DailyCollectionSheet }) {
  const { outstanding } = sheet;
  if (outstanding.rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No outstanding payments for this date.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="font-semibold">Customer</TableHead>
            <TableHead className="font-semibold">Invoice</TableHead>
            <TableHead className="text-right font-semibold">Total</TableHead>
            <TableHead className="text-right font-semibold">Paid</TableHead>
            <TableHead className="text-right font-semibold">Pending</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {outstanding.rows.map((row) => (
            <TableRow key={row.invoiceId}>
              <TableCell className="font-medium">{row.customerName}</TableCell>
              <TableCell>
                <Link
                  href={`/invoices/${row.invoiceId}`}
                  className="text-primary hover:underline"
                >
                  {row.invoiceNumber}
                </Link>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(row.grandTotal)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(row.amountPaid)}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatCurrency(row.amountPending)}
              </TableCell>
              <TableCell>
                <Badge variant={row.status === "PENDING" ? "warning" : "secondary"}>
                  {row.status === "PENDING" ? "Pending" : "Partial"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
            <TableHead className="text-right font-semibold">Net Collection</TableHead>
            <TableHead className="font-semibold">Cash</TableHead>
            <TableHead className="text-right font-semibold">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const cash = row.cashReconciliation;
            const diffStatus =
              cash != null ? formatCashDifference(cash.cashDifference) : null;

            return (
              <TableRow key={row.date}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell>
                  {row.collected ? (
                    <Badge variant="success">Collected ✓</Badge>
                  ) : (
                    <Badge variant="secondary">Not Collected</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.snapshot ? formatCurrency(row.snapshot.netCollection) : "—"}
                </TableCell>
                <TableCell>
                  {!row.collected || !cash ? (
                    <span className="text-sm text-muted-foreground">—</span>
                  ) : diffStatus?.reconciled ? (
                    <Badge variant="success">Reconciled ✓</Badge>
                  ) : (
                    <span className="text-sm font-medium text-destructive">
                      Mismatch ⚠
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onSelectDate(row.date)}>
                    View
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

export function DailyCollectionPanel() {
  const [selectedDate, setSelectedDate] = useState(formatDateInput(new Date()));
  const [sheet, setSheet] = useState<DailyCollectionSheet | null>(null);
  const [notes, setNotes] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [denominations, setDenominations] = useState<CashDenominations>(emptyCashState());
  const [collectorName, setCollectorName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      setDenominations(
        cashStateFromReconciliation(result.data.collection?.cashReconciliation)
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSheet(selectedDate);
  }, [selectedDate, loadSheet]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/profile");
      const result = await readApiResponse<{ name: string; username: string }>(
        res,
        "Failed to load profile"
      );
      if (result.ok) {
        setCollectorName(result.data.name || result.data.username);
      }
    })();
  }, []);

  const handleMarkCollected = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/daily-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          notes,
          cashDenominations: denominations,
        }),
      });
      const result = await readApiResponse(res, "Failed to mark collection");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Day collection marked and saved");
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
        body: JSON.stringify({
          date: selectedDate,
          notes,
          cashDenominations: denominations,
        }),
      });
      const result = await readApiResponse(res, "Failed to update collection");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Collection record updated");
      await loadSheet(selectedDate);
    } finally {
      setSaving(false);
    }
  };

  const collected = !!sheet?.collection;
  const collectedByName =
    sheet?.collection?.collectedBy.name ?? collectorName ?? "—";

  return (
    <div className="space-y-8">
      <Card className={sectionCard}>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Label htmlFor="collection-date">Date</Label>
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
          <div className="flex flex-wrap items-center gap-2">
            {sheet?.isSnapshot && (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" />
                Saved Report
              </Badge>
            )}
            {collected ? (
              <Badge variant="success" className="h-8 px-3 text-sm">
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Collected
              </Badge>
            ) : (
              <Badge variant="warning" className="h-8 px-3 text-sm">
                Not Collected
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {loading || !sheet ? (
        <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading daily collection report…
        </div>
      ) : (
        <>
          {/* Section 1: Revenue Earned */}
          <section className="space-y-4">
            <SectionHeader title="Revenue Earned" />
            <div className="grid gap-4 sm:grid-cols-3">
              <SummaryKpi label="Total Revenue" value={sheet.totalRevenue} />
              <SummaryKpi label="Subscription Revenue" value={sheet.subscriptionRevenue} />
              <SummaryKpi label="Product Revenue" value={sheet.productRevenue} />
            </div>
            <RevenueBreakdownTable sheet={sheet} />
          </section>

          {/* Section 2: Expenses */}
          <section className="space-y-4">
            <SectionHeader title="Expenses" />
            <SummaryKpi label="Total Expenses" value={sheet.totalExpenses} />
            <ExpenseTable expenses={sheet.expenses} />
          </section>

          {/* Section 3: Collections Breakdown */}
          <section className="space-y-4">
            <SectionHeader title="Collections Breakdown" />
            <div className="grid gap-4 sm:grid-cols-3">
              <SummaryKpi label="Cash Collected" value={sheet.paymentBreakdown.cash} />
              <SummaryKpi label="UPI / PhonePe Collected" value={sheet.paymentBreakdown.upi} />
              <SummaryKpi label="Total Collected" value={sheet.paymentBreakdown.totalCollected} />
            </div>
          </section>

          {/* Section 4: Outstanding Payments */}
          <section className="space-y-4">
            <SectionHeader
              title="Outstanding Payments"
              description="Customers who still owe money from invoices created today"
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className={summaryCard}>
                <p className="text-sm text-muted-foreground">Pending Customers</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {sheet.outstanding.pendingCustomerCount}
                </p>
              </div>
              <div className={summaryCard}>
                <p className="text-sm text-muted-foreground">Partial Payments</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {sheet.outstanding.partialCustomerCount}
                </p>
              </div>
              <SummaryKpi
                label="Outstanding Amount"
                value={sheet.outstanding.outstandingAmount}
              />
            </div>
            <OutstandingTable sheet={sheet} />
          </section>

          {/* Section 5: Day Closing Summary */}
          <section className="space-y-4">
            <SectionHeader title="Day Closing Summary" />
            <Card className={cn(sectionCard, "border-primary/30 bg-primary/5")}>
              <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue Earned</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {formatCurrency(sheet.totalRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expenses Given</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-destructive">
                    {formatCurrency(sheet.totalExpenses)}
                  </p>
                </div>
                <div className="rounded-lg border border-primary/30 bg-background/60 p-4">
                  <p className="text-sm font-medium text-primary">Net Collection</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-primary">
                    {formatCurrency(sheet.netCollection)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Revenue Earned − Expenses Given
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 6: Physical Cash Verification */}
          <section className="space-y-4">
            <CashDenominationSection
              systemCash={sheet.paymentBreakdown.cash}
              denominations={denominations}
              onDenominationsChange={setDenominations}
              denominationsLocked={collected}
              storedReconciliation={sheet.collection?.cashReconciliation}
            />
          </section>

          {/* Section 7: Collection Acknowledgement */}
          <section className="space-y-4">
            <Card className={sectionCard}>
              <CardHeader className="border-b border-border px-5 py-4">
                <CardTitle className="text-base">Collection Acknowledgement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                {collected && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <p className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                      Collection recorded
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Collected at {formatDateTime(sheet.collection!.collectedAt)}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="collected-by">Collected By</Label>
                  <Input
                    id="collected-by"
                    value={collectedByName}
                    readOnly
                    className="bg-muted/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collection-notes">Notes</Label>
                  <Textarea
                    id="collection-notes"
                    rows={4}
                    placeholder="Collected all cash and verified PhonePe settlement."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {collected ? (
                  <Button onClick={handleSaveNotes} disabled={saving}>
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                ) : (
                  <Button onClick={handleMarkCollected} disabled={saving}>
                    {saving ? "Saving…" : "Mark Collection As Collected"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {sheet && (
        <Modal
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          title="Collection History"
          description="Review previous days — select a date to load its saved report"
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
