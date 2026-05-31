"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { readApiResponse } from "@/lib/api-error";

type Period = "daily" | "weekly" | "monthly";

type RevenueRow = {
  key: string;
  label: string;
  date: string;
  invoiceCount: number;
  customersServed: number;
  totalRevenue: number;
};

type Transaction = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  paymentStatus: string;
  createdBy: string;
  time: string;
};

type RevenueSummary = {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
};

const glassCard = cn(
  "rounded-xl border backdrop-blur-md",
  "border-[#E2E8F0]/90 bg-white/90 shadow-[0_4px_24px_rgba(0,112,192,0.07)]",
  "dark:border-white/10 dark:bg-card/85"
);

const periodLabels: Record<Period, string> = {
  daily: "Daily Revenue Logs",
  weekly: "Weekly Revenue Logs",
  monthly: "Monthly Revenue Logs",
};

export function RevenueReportsPanel() {
  const [period, setPeriod] = useState<Period>("daily");
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayTransactions, setDayTransactions] = useState<Transaction[]>([]);

  const loadSummary = useCallback(async () => {
    const res = await fetch("/api/admin/revenue/summary");
    const result = await readApiResponse<RevenueSummary>(res, "Failed to load summary");
    if (result.ok) setSummary(result.data);
  }, []);

  const loadRecentTransactions = useCallback(async () => {
    const res = await fetch("/api/admin/revenue/transactions?recent=20");
    const result = await readApiResponse<{ transactions: Transaction[] }>(
      res,
      "Failed to load transaction history"
    );
    if (result.ok) setRecentTransactions(result.data.transactions ?? []);
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const res = await fetch(`/api/admin/revenue?${params}`);
      const result = await readApiResponse<{ rows: RevenueRow[] }>(res, "Failed to load revenue");
      if (result.ok) {
        setRows(result.data.rows ?? []);
      } else {
        toast.error(result.message);
      }
    } finally {
      setLoading(false);
    }
  }, [period, fromDate, toDate]);

  useEffect(() => {
    loadSummary();
    loadRecentTransactions();
  }, [loadSummary, loadRecentTransactions]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const loadDayTransactions = async (date: string) => {
    setSelectedDay(date);
    const res = await fetch(`/api/admin/revenue/transactions?date=${date}`);
    const result = await readApiResponse<{ transactions: Transaction[] }>(
      res,
      "Failed to load transactions"
    );
    if (result.ok) {
      setDayTransactions(result.data.transactions ?? []);
    }
  };

  const exportCsv = () => {
    if (!fromDate || !toDate) {
      toast.error("Select From and To dates to export");
      return;
    }
    window.open(`/api/admin/revenue/export?from=${fromDate}&to=${toDate}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <Card className={glassCard}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Revenue Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-[#E2E8F0]/80 bg-[#F8FAFC]/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-sm text-muted-foreground">Today&apos;s Revenue</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {formatCurrency(summary?.todayRevenue ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-[#E2E8F0]/80 bg-[#F8FAFC]/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-sm text-muted-foreground">This Week Revenue</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {formatCurrency(summary?.weekRevenue ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-[#E2E8F0]/80 bg-[#F8FAFC]/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-sm text-muted-foreground">This Month Revenue</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {formatCurrency(summary?.monthRevenue ?? 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
          <input
            type="date"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
          <input
            type="date"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={loadLogs}>
          Apply
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
          <Button
            key={p}
            type="button"
            size="sm"
            variant={period === p ? "default" : "outline"}
            className={period === p ? "bg-[#0070C0] hover:bg-[#005499]" : ""}
            onClick={() => {
              setPeriod(p);
              setSelectedDay(null);
            }}
          >
            {p === "daily" ? "Daily" : p === "weekly" ? "Weekly" : "Monthly"}
          </Button>
        ))}
      </div>

      <Card className={glassCard}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{periodLabels[period]}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {period === "monthly" ? "Month" : period === "weekly" ? "Week" : "Date"}
                    </TableHead>
                    {period === "daily" && (
                      <>
                        <TableHead className="text-right">Invoices</TableHead>
                        <TableHead className="text-right">Customers</TableHead>
                      </>
                    )}
                    {period !== "daily" && (
                      <TableHead className="text-right">Invoices</TableHead>
                    )}
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.key}
                      className={cn(
                        period === "daily" && "cursor-pointer hover:bg-[#0070C0]/5",
                        selectedDay === row.key && "bg-[#0070C0]/10"
                      )}
                      onClick={() => period === "daily" && loadDayTransactions(row.key)}
                    >
                      <TableCell className="font-medium">{row.label}</TableCell>
                      {period === "daily" && (
                        <>
                          <TableCell className="text-right tabular-nums">{row.invoiceCount}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.customersServed}</TableCell>
                        </>
                      )}
                      {period !== "daily" && (
                        <TableCell className="text-right tabular-nums">{row.invoiceCount}</TableCell>
                      )}
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(row.totalRevenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedDay && period === "daily" && (
        <Card className={glassCard}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">
              Transactions — {rows.find((r) => r.key === selectedDay)?.label}
            </CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <TransactionTable transactions={dayTransactions} />
          </CardContent>
        </Card>
      )}

      <Card className={glassCard}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TransactionTable transactions={recentTransactions} />
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-muted-foreground">No transactions</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created By</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell>
                <Link href={`/invoices/${tx.id}`} className="font-medium text-primary hover:underline">
                  {tx.invoiceNumber}
                </Link>
              </TableCell>
              <TableCell>{tx.customerName}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(tx.amount)}</TableCell>
              <TableCell>
                <Badge variant={paymentStatusBadgeVariant(tx.paymentStatus)}>
                  {paymentStatusLabel(tx.paymentStatus)}
                </Badge>
              </TableCell>
              <TableCell>{tx.createdBy}</TableCell>
              <TableCell>{tx.time}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
