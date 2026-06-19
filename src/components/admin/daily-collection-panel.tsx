"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Pencil,
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
import { calculateCasualSwimCouponRevenue } from "@/lib/casual-swim-coupon";
import {
  CashDenominationSection,
  cashStateFromReconciliation,
  emptyCashState,
} from "@/components/admin/cash-denomination-section";
import { type CashDenominations } from "@/lib/cash-denominations";
import { ExpensePaymentModeBadge } from "@/lib/expenses/payment-mode";
import { DailyCollectionVersionHistory } from "@/components/admin/daily-collection-version-history";

const sectionCard = cn("glass-panel overflow-hidden");

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

function SummaryStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border/60 bg-card/50 p-4", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function BreakdownToggle({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold">{label}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? <div className="border-t border-border/60">{children}</div> : null}
    </div>
  );
}

function RevenueSourceBreakdownCard({
  sheet,
  casualSwim,
  totalRevenue,
}: {
  sheet: DailyCollectionSheet;
  casualSwim: DailyCollectionSheet["casualSwim"];
  totalRevenue: number;
}) {
  return (
    <Card className={sectionCard}>
      <CardHeader className="border-b border-border px-5 py-4">
        <CardTitle className="text-base">Revenue Source Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Invoices &amp; Subscriptions</p>
            <p className="text-xs text-muted-foreground">Coaching packages and product sales</p>
          </div>
          <p className="text-lg font-bold tabular-nums">{formatCurrency(sheet.invoiceRevenue)}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Casual Swimming</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Coupons Used: {casualSwim.couponsUsed} · Rate: {formatCurrency(casualSwim.couponRate)}
              </p>
            </div>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(casualSwim.revenue)}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3 font-semibold">
          <span>Total Revenue</span>
          <span className="text-lg tabular-nums text-primary">{formatCurrency(totalRevenue)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function RevenueBreakdownTable({ sheet }: { sheet: DailyCollectionSheet }) {
  const [open, setOpen] = useState(false);

  if (sheet.revenueBreakdown.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Subscription &amp; Product Line Items</p>
          <p className="text-xs text-muted-foreground">
            Subscription {formatCurrency(sheet.subscriptionRevenue)} · Products{" "}
            {formatCurrency(sheet.productRevenue)}
          </p>
        </div>
        <p className="text-lg font-bold tabular-nums">{formatCurrency(sheet.totalRevenue)}</p>
      </div>
      <BreakdownToggle
        label={`View ${sheet.revenueBreakdown.length} revenue record${sheet.revenueBreakdown.length === 1 ? "" : "s"}`}
        open={open}
        onToggle={() => setOpen((v) => !v)}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Revenue Source</TableHead>
                <TableHead className="text-right font-semibold">Count</TableHead>
                <TableHead className="text-right font-semibold">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sheet.revenueBreakdown.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(row.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </BreakdownToggle>
    </div>
  );
}

function ExpenseTable({
  expenses,
  cashTotal,
  upiTotal,
  total,
}: {
  expenses: DailyCollectionSheet["expenses"];
  cashTotal: number;
  upiTotal: number;
  total: number;
}) {
  const [open, setOpen] = useState(false);

  if (expenses.length === 0) {
    return <p className="text-sm text-muted-foreground">No expenses for this date.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60">
        <div className="flex items-center justify-between gap-3 bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <ExpensePaymentModeBadge mode="CASH" />
            <span className="text-sm font-medium">Expense via Cash</span>
          </div>
          <span className="font-semibold tabular-nums text-destructive">
            {formatCurrency(cashTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <ExpensePaymentModeBadge mode="UPI" />
            <span className="text-sm font-medium">Expense via UPI</span>
          </div>
          <span className="font-semibold tabular-nums text-destructive">
            {formatCurrency(upiTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3 font-semibold">
          <span className="text-sm">Total Expenses</span>
          <span className="tabular-nums text-destructive">{formatCurrency(total)}</span>
        </div>
      </div>
      <BreakdownToggle
        label={`View ${expenses.length} expense record${expenses.length === 1 ? "" : "s"}`}
        open={open}
        onToggle={() => setOpen((v) => !v)}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Time</TableHead>
                <TableHead className="font-semibold">To Whom</TableHead>
                <TableHead className="font-semibold">Reason</TableHead>
                <TableHead className="font-semibold">Mode</TableHead>
                <TableHead className="text-right font-semibold">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="tabular-nums">{formatTime(expense.createdAt)}</TableCell>
                  <TableCell>{expense.paidTo}</TableCell>
                  <TableCell>{expense.reason}</TableCell>
                  <TableCell>
                    <ExpensePaymentModeBadge mode={expense.paymentMode} />
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </BreakdownToggle>
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
            <TableHead className="text-right font-semibold">Net</TableHead>
            <TableHead className="text-right font-semibold">Cash</TableHead>
            <TableHead className="text-right font-semibold">UPI</TableHead>
            <TableHead className="text-right font-semibold">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.date}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell>
                {row.collected ? (
                  <Badge variant="success">Collected</Badge>
                ) : (
                  <Badge variant="secondary">Pending</Badge>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.snapshot ? formatCurrency(row.snapshot.netCollection) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.snapshot ? formatCurrency(row.snapshot.cashCollected) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.snapshot ? formatCurrency(row.snapshot.upiCollected) : "—"}
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [denominations, setDenominations] = useState<CashDenominations>(emptyCashState());
  const [collectorName, setCollectorName] = useState("");
  const [profileDefaultName, setProfileDefaultName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [lastCouponInput, setLastCouponInput] = useState("");

  const loadSheet = useCallback(async (date: string, preferLive = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (preferLive) params.set("live", "1");
      const res = await fetch(`/api/admin/daily-collection?${params.toString()}`);
      const result = await readApiResponse<DailyCollectionSheet>(res, "Failed to load collection");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSheet(result.data);
      setNotes(result.data.collection?.notes ?? "");
      setLastCouponInput(
        result.data.casualSwim.lastCouponNumber != null
          ? String(result.data.casualSwim.lastCouponNumber)
          : ""
      );
      setDenominations(
        cashStateFromReconciliation(result.data.collection?.cashReconciliation)
      );
      if (result.data.collection) {
        setCollectorName(
          result.data.collection.collectedByName ??
            result.data.collection.collectedBy.name ??
            result.data.collection.collectedBy.username
        );
      } else {
        setCollectorName(profileDefaultName);
      }
    } finally {
      setLoading(false);
    }
  }, [profileDefaultName]);

  useEffect(() => {
    setEditMode(false);
  }, [selectedDate]);

  useEffect(() => {
    void loadSheet(selectedDate, editMode);
  }, [selectedDate, editMode, loadSheet]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/profile");
      const result = await readApiResponse<{ name: string; username: string }>(
        res,
        "Failed to load profile"
      );
      if (result.ok) {
        const defaultName = result.data.name || result.data.username;
        setProfileDefaultName(defaultName);
        setCollectorName((prev) => prev || defaultName);
      }
    })();
  }, []);

  const submitCollection = async (method: "POST" | "PUT") => {
    const parsedCoupon = parseInt(lastCouponInput, 10);
    if (Number.isNaN(parsedCoupon)) {
      toast.error("Enter today's last coupon number");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/daily-collection", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          notes,
          collectedByName: collectorName.trim(),
          lastCouponNumber: parsedCoupon,
          cashDenominations: denominations,
        }),
      });
      const result = await readApiResponse(res, "Failed to save collection");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(
        method === "PUT"
          ? "Daily collection updated successfully"
          : "Day collection recorded"
      );
      setEditMode(false);
      setHistoryRefreshKey((k) => k + 1);
      await loadSheet(selectedDate);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkCollected = () => submitCollection("POST");
  const handleSaveChanges = () => submitCollection("PUT");

  const collected = !!sheet?.collection;
  const formLocked = collected && !editMode;
  const couponEditable = !formLocked;

  const couponPreview = useMemo(() => {
    if (!sheet || !couponEditable) return null;
    const parsed = parseInt(lastCouponInput, 10);
    if (Number.isNaN(parsed)) return null;
    return calculateCasualSwimCouponRevenue(
      sheet.casualSwim.previousClosingCoupon,
      parsed,
      sheet.casualSwim.couponRate
    );
  }, [sheet, lastCouponInput, couponEditable]);

  const displayCasualSwim = useMemo(() => {
    if (!sheet) return null;
    if (couponPreview?.ok) {
      return {
        previousClosingCoupon: couponPreview.result.previousClosingCoupon,
        lastCouponNumber: couponPreview.result.lastCouponNumber,
        couponRate: couponPreview.result.couponRate,
        couponsUsed: couponPreview.result.couponsUsed,
        revenue: couponPreview.result.revenue,
      };
    }
    return sheet.casualSwim;
  }, [sheet, couponPreview]);

  const displayTotals = useMemo(() => {
    if (!sheet || !displayCasualSwim) return null;
    const invoiceCash = sheet.paymentBreakdown.cash - sheet.casualSwim.revenue;
    const casualRevenue = displayCasualSwim.revenue;
    const totalRevenue = sheet.invoiceRevenue + casualRevenue;
    const grossCash = invoiceCash + casualRevenue;
    const netCash = grossCash - sheet.cashExpenses;
    const netCollection = totalRevenue - sheet.totalExpenses;
    return { totalRevenue, netCollection, grossCash, netCash };
  }, [sheet, displayCasualSwim]);

  const paymentBreakdown = useMemo(() => {
    if (!sheet) {
      return {
        cash: 0,
        upi: 0,
        card: 0,
        other: 0,
        grossCollected: 0,
        cashExpenses: 0,
        upiExpenses: 0,
        netCash: 0,
        netUpi: 0,
      };
    }
    if (!displayTotals || !couponEditable) return sheet.paymentBreakdown;
    return {
      ...sheet.paymentBreakdown,
      cash: displayTotals.grossCash,
      grossCollected:
        displayTotals.grossCash +
        sheet.paymentBreakdown.upi +
        sheet.paymentBreakdown.card +
        sheet.paymentBreakdown.other,
      netCash: displayTotals.netCash,
    };
  }, [sheet, displayTotals, couponEditable]);

  const totalRevenue = displayTotals?.totalRevenue ?? sheet?.totalRevenue ?? 0;
  const netCollection = displayTotals?.netCollection ?? sheet?.netCollection ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className={sectionCard}>
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
          <div className="flex flex-wrap items-center gap-2">
            {sheet?.isSnapshot && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Saved
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
        <div className="flex min-h-[280px] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading daily collection…
        </div>
      ) : (
        <>
          <Card className={cn(sectionCard, "border-primary/30 bg-primary/5")}>
            <CardHeader className="border-b border-primary/15 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base text-primary">Daily Collection</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Net Collection: {formatCurrency(netCollection)}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  {collected && !editMode && (
                    <Button type="button" variant="outline" onClick={() => setEditMode(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Collection
                    </Button>
                  )}
                  {collected && sheet.editMeta && (
                    <DailyCollectionVersionHistory
                      date={selectedDate}
                      lastEditedAt={sheet.editMeta.lastEditedAt}
                      refreshKey={historyRefreshKey}
                    />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <p className="text-4xl font-bold tabular-nums text-primary sm:text-5xl">
                {formatCurrency(netCollection)}
              </p>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <SummaryStat label="Revenue Earned" value={formatCurrency(totalRevenue)} />
                <SummaryStat
                  label="Expense · Cash"
                  value={formatCurrency(sheet.cashExpenses)}
                  className="[&_p:last-child]:text-destructive"
                />
                <SummaryStat
                  label="Expense · UPI"
                  value={formatCurrency(sheet.upiExpenses)}
                  className="border-sky-500/30 bg-sky-500/5 [&_p:first-child]:text-sky-700 dark:[&_p:first-child]:text-sky-400 [&_p:last-child]:text-destructive"
                />
                <SummaryStat
                  label="Cash Collected"
                  value={formatCurrency(paymentBreakdown.cash)}
                  className="border-emerald-500/30 bg-emerald-500/5 [&_p:first-child]:text-emerald-700 dark:[&_p:first-child]:text-emerald-400"
                />
                <SummaryStat
                  label="UPI / PhonePe"
                  value={formatCurrency(paymentBreakdown.upi)}
                  className="border-sky-500/30 bg-sky-500/5 [&_p:first-child]:text-sky-700 dark:[&_p:first-child]:text-sky-400"
                />
              </div>

              {(sheet.cashExpenses > 0 || sheet.upiExpenses > 0) && (
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  {sheet.cashExpenses > 0 && (
                    <p>Cash in drawer after expenses: {formatCurrency(paymentBreakdown.netCash)}</p>
                  )}
                  {sheet.upiExpenses > 0 && (
                    <p>UPI after expenses: {formatCurrency(paymentBreakdown.netUpi)}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={sectionCard}>
            <CardHeader className="border-b border-border px-5 py-4">
              <CardTitle className="text-base">Casual Swimming Coupon Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="previous-closing-coupon">Previous Closing Coupon</Label>
                  <Input
                    id="previous-closing-coupon"
                    value={sheet.casualSwim.previousClosingCoupon}
                    readOnly
                    disabled
                    className="cursor-not-allowed opacity-80"
                  />
                  <p className="text-xs text-muted-foreground">
                    Carried forward from the most recent saved closing coupon.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-coupon-number">Today&apos;s Last Coupon</Label>
                  <Input
                    id="last-coupon-number"
                    type="number"
                    min={sheet.casualSwim.previousClosingCoupon}
                    step={1}
                    value={lastCouponInput}
                    onChange={(e) => setLastCouponInput(e.target.value)}
                    readOnly={!couponEditable}
                    disabled={!couponEditable}
                    placeholder="e.g. 120"
                    className={cn(!couponEditable && "cursor-not-allowed opacity-80")}
                  />
                  {couponPreview && !couponPreview.ok && (
                    <p className="text-sm text-destructive">{couponPreview.message}</p>
                  )}
                </div>
              </div>
              {displayCasualSwim && (
                <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
                  <p>
                    Coupons Used: <span className="font-semibold">{displayCasualSwim.couponsUsed}</span>
                  </p>
                  <p>
                    Rate: <span className="font-semibold">{formatCurrency(displayCasualSwim.couponRate)}</span>
                  </p>
                  <p>
                    Revenue: <span className="font-semibold">{formatCurrency(displayCasualSwim.revenue)}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {displayCasualSwim && (
            <RevenueSourceBreakdownCard
              sheet={sheet}
              casualSwim={displayCasualSwim}
              totalRevenue={totalRevenue}
            />
          )}

          {(sheet.revenueBreakdown.length > 0 || sheet.expenses.length > 0) && (
            <Card className={sectionCard}>
              <CardHeader className="border-b border-border px-5 py-4">
                <CardTitle className="text-base">Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-5">
                {sheet.revenueBreakdown.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Revenue Detail</h3>
                    <RevenueBreakdownTable sheet={sheet} />
                  </div>
                )}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Expenses</h3>
                  <ExpenseTable
                    expenses={sheet.expenses}
                    cashTotal={sheet.cashExpenses}
                    upiTotal={sheet.upiExpenses}
                    total={sheet.totalExpenses}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <CashDenominationSection
            systemCash={paymentBreakdown.netCash}
            denominations={denominations}
            onDenominationsChange={setDenominations}
            denominationsLocked={formLocked}
            storedReconciliation={sheet.collection?.cashReconciliation}
          />

          <Card className={sectionCard}>
            <CardHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-4">
              <CardTitle className="text-base">
                {collected ? "Collection Record" : "Mark Collection As Collected"}
              </CardTitle>
              {editMode && <Badge variant="warning">Editing</Badge>}
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {collected && !editMode && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <p className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    Recorded at {formatDateTime(sheet.collection!.collectedAt)}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="collected-by">Collected By</Label>
                <Input
                  id="collected-by"
                  value={collectorName}
                  onChange={(e) => setCollectorName(e.target.value)}
                  placeholder="Owner or collector name"
                  readOnly={formLocked}
                  disabled={formLocked}
                  className={cn(formLocked && "cursor-not-allowed opacity-80")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="collection-notes">Owner Notes</Label>
                <Textarea
                  id="collection-notes"
                  rows={3}
                  placeholder="Collected all cash and verified PhonePe settlement."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  readOnly={formLocked}
                  disabled={formLocked}
                  className={cn(formLocked && "cursor-not-allowed opacity-80")}
                />
              </div>

              {!collected && (
                <Button
                  onClick={handleMarkCollected}
                  disabled={
                    saving ||
                    !collectorName.trim() ||
                    !lastCouponInput.trim() ||
                    (couponPreview != null && !couponPreview.ok)
                  }
                >
                  {saving ? "Saving…" : "Mark Collection As Collected"}
                </Button>
              )}

              {editMode && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleSaveChanges}
                    disabled={
                      saving ||
                      !collectorName.trim() ||
                      !lastCouponInput.trim() ||
                      (couponPreview != null && !couponPreview.ok)
                    }
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => {
                      setEditMode(false);
                      void loadSheet(selectedDate);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
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
          description="Select a date to view its report"
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
