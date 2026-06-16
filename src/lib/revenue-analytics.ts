import {
  startOfDay,
  endOfDay,
  subDays,
  subWeeks,
  subMonths,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
  isValid,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import { getActiveInvoiceWhere } from "@/lib/invoice-filters";
import { getCollectedInvoiceWhere, invoiceCollectedAmount } from "@/lib/invoice-revenue";

export type RevenuePeriod = "daily" | "weekly" | "monthly";

export type RevenueBucket = {
  key: string;
  label: string;
  date: string;
  invoiceCount: number;
  customersServed: number;
  totalRevenue: number;
};

export type RevenueTransaction = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  paymentStatus: string;
  paymentMethod: string;
  createdBy: string;
  time: string;
  invoiceDate: string;
};

const invoiceSelect = {
  id: true,
  invoiceNumber: true,
  customerName: true,
  customerId: true,
  grandTotal: true,
  amountPaid: true,
  paymentStatus: true,
  paymentMethod: true,
  invoiceDate: true,
  createdAt: true,
  createdBy: { select: { name: true } },
} as const;

function parseDateInput(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

function dayKey(date: Date): string {
  return format(startOfDay(date), "yyyy-MM-dd");
}

function customerKey(customerId: string | null, customerName: string): string {
  return customerId ?? `name:${customerName}`;
}

async function fetchInvoicesBetween(from: Date, to: Date) {
  const invoiceWhere = await getActiveInvoiceWhere();
  return prisma.invoice.findMany({
    where: {
      ...getCollectedInvoiceWhere(invoiceWhere),
      invoiceDate: { gte: startOfDay(from), lte: endOfDay(to) },
    },
    select: invoiceSelect,
    orderBy: { invoiceDate: "asc" },
  });
}

function aggregateInvoices(
  invoices: Awaited<ReturnType<typeof fetchInvoicesBetween>>,
  bucketFn: (date: Date) => { key: string; label: string; date: string }
): RevenueBucket[] {
  const map = new Map<string, RevenueBucket & { customers: Set<string> }>();

  for (const inv of invoices) {
    const bucket = bucketFn(new Date(inv.invoiceDate));
    if (!map.has(bucket.key)) {
      map.set(bucket.key, {
        ...bucket,
        invoiceCount: 0,
        customersServed: 0,
        totalRevenue: 0,
        customers: new Set(),
      });
    }
    const row = map.get(bucket.key)!;
    row.invoiceCount += 1;
    row.totalRevenue += invoiceCollectedAmount(inv);
    row.customers.add(customerKey(inv.customerId, inv.customerName));
  }

  return Array.from(map.values())
    .map(({ customers, ...row }) => ({
      ...row,
      customersServed: customers.size,
      totalRevenue: Math.round(row.totalRevenue * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getDailyRevenue(days = 7, from?: Date, to?: Date) {
  const end = to ? endOfDay(to) : endOfDay(new Date());
  const start = from ? startOfDay(from) : startOfDay(subDays(end, days - 1));

  const invoices = await fetchInvoicesBetween(start, end);
  const buckets = aggregateInvoices(invoices, (date) => ({
    key: dayKey(date),
    label: format(date, "d MMM yyyy"),
    date: dayKey(date),
  }));

  const allDays: RevenueBucket[] = [];
  let cursor = startOfDay(start);
  const endDay = startOfDay(end);
  while (cursor <= endDay) {
    const key = dayKey(cursor);
    const existing = buckets.find((b) => b.key === key);
    allDays.push(
      existing ?? {
        key,
        label: format(cursor, "d MMM yyyy"),
        date: key,
        invoiceCount: 0,
        customersServed: 0,
        totalRevenue: 0,
      }
    );
    cursor = subDays(cursor, -1);
  }

  return allDays;
}

export async function getWeeklyRevenue(weeks = 10, from?: Date, to?: Date) {
  const end = to ? endOfDay(to) : endOfDay(new Date());
  const start = from
    ? startOfWeek(startOfDay(from), { weekStartsOn: 1 })
    : startOfWeek(subWeeks(end, weeks - 1), { weekStartsOn: 1 });

  const invoices = await fetchInvoicesBetween(start, end);
  const buckets = aggregateInvoices(invoices, (date) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = subDays(weekStart, -6);
    return {
      key: dayKey(weekStart),
      label: `${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM yyyy")}`,
      date: dayKey(weekStart),
    };
  });

  const allWeeks: RevenueBucket[] = [];
  let cursor = startOfWeek(start, { weekStartsOn: 1 });
  const endWeek = startOfWeek(end, { weekStartsOn: 1 });
  while (cursor <= endWeek) {
    const key = dayKey(cursor);
    const weekEnd = subDays(cursor, -6);
    const existing = buckets.find((b) => b.key === key);
    allWeeks.push(
      existing ?? {
        key,
        label: `${format(cursor, "d MMM")} – ${format(weekEnd, "d MMM yyyy")}`,
        date: key,
        invoiceCount: 0,
        customersServed: 0,
        totalRevenue: 0,
      }
    );
    cursor = subWeeks(cursor, -1);
  }

  return allWeeks;
}

export async function getMonthlyRevenue(months = 12, from?: Date, to?: Date) {
  const end = to ? endOfMonth(to) : endOfMonth(new Date());
  const start = from
    ? startOfMonth(from)
    : startOfMonth(subMonths(end, months - 1));

  const invoices = await fetchInvoicesBetween(start, end);
  const buckets = aggregateInvoices(invoices, (date) => {
    const monthStart = startOfMonth(date);
    return {
      key: format(monthStart, "yyyy-MM"),
      label: format(monthStart, "MMMM yyyy"),
      date: format(monthStart, "yyyy-MM-dd"),
    };
  });

  const allMonths: RevenueBucket[] = [];
  let cursor = startOfMonth(start);
  const endMonth = startOfMonth(end);
  while (cursor <= endMonth) {
    const key = format(cursor, "yyyy-MM");
    const existing = buckets.find((b) => b.key === key);
    allMonths.push(
      existing ?? {
        key,
        label: format(cursor, "MMMM yyyy"),
        date: format(cursor, "yyyy-MM-dd"),
        invoiceCount: 0,
        customersServed: 0,
        totalRevenue: 0,
      }
    );
    cursor = subMonths(cursor, -1);
  }

  return allMonths;
}

export async function getRevenueAnalytics(
  period: RevenuePeriod,
  fromStr?: string | null,
  toStr?: string | null
) {
  const from = parseDateInput(fromStr ?? undefined);
  const to = parseDateInput(toStr ?? undefined);

  switch (period) {
    case "weekly":
      return getWeeklyRevenue(10, from ?? undefined, to ?? undefined);
    case "monthly":
      return getMonthlyRevenue(12, from ?? undefined, to ?? undefined);
    default:
      return getDailyRevenue(from && to ? undefined : 7, from ?? undefined, to ?? undefined);
  }
}

export async function getTransactionsForDay(dateStr: string): Promise<RevenueTransaction[]> {
  const date = parseDateInput(dateStr);
  if (!date) return [];

  const invoices = await fetchInvoicesBetween(date, date);
  return invoices
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      amount: invoiceCollectedAmount(inv),
      paymentStatus: inv.paymentStatus,
      paymentMethod: inv.paymentMethod,
      createdBy: inv.createdBy.name,
      time: new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(inv.createdAt)),
      invoiceDate: dayKey(new Date(inv.invoiceDate)),
    }));
}

export async function getTodayRevenue(): Promise<number> {
  const today = new Date();
  const rows = await getDailyRevenue(1, today, today);
  return rows[0]?.totalRevenue ?? 0;
}

export async function getMonthRevenue(): Promise<number> {
  const now = new Date();
  const rows = await getMonthlyRevenue(1, startOfMonth(now), endOfMonth(now));
  return rows[0]?.totalRevenue ?? 0;
}

export async function getWeekRevenue(): Promise<number> {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const invoices = await fetchInvoicesBetween(weekStart, now);
  const total = invoices.reduce((sum, inv) => sum + invoiceCollectedAmount(inv), 0);
  return Math.round(total * 100) / 100;
}

/** Sum of amountPaid from paid invoices dated yesterday. */
export async function getYesterdayCollectedRevenue(): Promise<number> {
  const yesterday = subDays(new Date(), 1);
  const invoiceWhere = await getActiveInvoiceWhere();
  const result = await prisma.invoice.aggregate({
    where: {
      ...getCollectedInvoiceWhere(invoiceWhere),
      invoiceDate: { gte: startOfDay(yesterday), lte: endOfDay(yesterday) },
    },
    _sum: { amountPaid: true },
  });
  const total = Number(result._sum.amountPaid ?? 0);
  return Math.round(total * 100) / 100;
}

export async function getRecentTransactions(limit = 10): Promise<RevenueTransaction[]> {
  const invoiceWhere = await getActiveInvoiceWhere();
  const invoices = await prisma.invoice.findMany({
    where: getCollectedInvoiceWhere(invoiceWhere),
    take: limit,
    orderBy: { createdAt: "desc" },
    select: invoiceSelect,
  });

  return invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customerName,
    amount: invoiceCollectedAmount(inv),
    paymentStatus: inv.paymentStatus,
    paymentMethod: inv.paymentMethod,
    createdBy: inv.createdBy.name,
    time: new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(inv.createdAt)),
    invoiceDate: dayKey(new Date(inv.invoiceDate)),
  }));
}

export async function getExportRows(fromStr: string, toStr: string) {
  const from = parseDateInput(fromStr);
  const to = parseDateInput(toStr);
  if (!from || !to) return [];

  const invoices = await fetchInvoicesBetween(from, to);
  return invoices.map((inv) => ({
    invoiceNumber: inv.invoiceNumber,
    date: format(new Date(inv.invoiceDate), "dd-MM-yyyy"),
    customerName: inv.customerName,
    amount: invoiceCollectedAmount(inv),
    paymentStatus: inv.paymentStatus,
    createdBy: inv.createdBy.name,
    paymentMethod: inv.paymentMethod,
  }));
}

export function rowsToCsv(
  rows: Array<Record<string, string | number>>,
  headers: string[]
): string {
  const escape = (v: string | number) => {
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h] ?? "")).join(",")),
  ];
  return lines.join("\n");
}
