"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  FileText,
  Hash,
  MessageCircle,
  Phone,
  Printer,
  Receipt,
  User,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  paymentStatusLabel,
  paymentStatusBadgeVariant,
  paymentMethodLabel,
  isCoachingPackage,
} from "@/lib/constants";

export interface InvoiceDetailItem {
  id: string;
  slNo: number;
  itemType: string;
  description: string;
  quantity: number;
  unitPrice: string | number;
  amount: string | number;
  packageStartDate?: string | null;
  packageEndDate?: string | null;
}

export interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  customerMobile: string | null;
  customerAddress?: string | null;
  subtotal: string | number;
  cgstRate: string | number;
  sgstRate: string | number;
  cgstAmount: string | number;
  sgstAmount: string | number;
  totalGst: string | number;
  grandTotal: string | number;
  amountInWords: string;
  paymentStatus: string;
  paymentMethod: string;
  amountPaid: string | number;
  amountRemaining: string | number;
  gstEnabled: boolean;
  items: InvoiceDetailItem[];
}

interface InvoiceDetailViewProps {
  invoice: InvoiceDetail;
  onWhatsApp: () => void;
}

const glassCard = cn(
  "rounded-xl border backdrop-blur-md",
  "border-[#E2E8F0]/90 bg-white/90 shadow-[0_4px_24px_rgba(0,112,192,0.07)]",
  "dark:border-white/10 dark:bg-card/85 dark:shadow-[0_4px_24px_rgba(0,112,192,0.12)]"
);

function paymentStatusAccent(status: string) {
  switch (status) {
    case "FULLY_PAID":
      return {
        card: "border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/20",
        icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      };
    case "PARTIALLY_PAID":
      return {
        card: "border-amber-200/80 bg-amber-50/40 dark:border-amber-800/40 dark:bg-amber-950/20",
        icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      };
    default:
      return {
        card: "border-red-200/80 bg-red-50/40 dark:border-red-800/40 dark:bg-red-950/20",
        icon: "bg-red-500/15 text-red-600 dark:text-red-400",
      };
  }
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0070C0]/10 text-[#0070C0] dark:bg-[#0070C0]/20 dark:text-[#38bdf8]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-1.5 text-sm",
        bold && "font-semibold",
        muted && "text-muted-foreground"
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function InvoiceDetailView({
  invoice,
  onWhatsApp,
}: InvoiceDetailViewProps) {
  const paymentAccent = paymentStatusAccent(invoice.paymentStatus);
  const showGst = invoice.gstEnabled && Number(invoice.totalGst) > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-6">
      {/* Hero */}
      <section
        className={cn(
          "relative overflow-hidden rounded-2xl border p-5 sm:p-6",
          "border-[#0070C0]/20 bg-gradient-to-br from-[#0070C0]/12 via-white/95 to-[#38bdf8]/10",
          "shadow-[0_8px_40px_rgba(0,112,192,0.12)] backdrop-blur-xl",
          "dark:border-[#0070C0]/30 dark:from-[#0070C0]/25 dark:via-card/90 dark:to-[#38bdf8]/10"
        )}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#0070C0]/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-[#38bdf8]/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 border-white/60 bg-white/70 backdrop-blur-sm dark:border-white/10 dark:bg-card/60"
              asChild
            >
              <Link href="/invoices" aria-label="Back to invoices">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#0070C0] dark:text-[#38bdf8]">
                  <Receipt className="h-3.5 w-3.5" />
                  MR Academy · Invoice Preview
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {invoice.invoiceNumber}
                </h1>
                <p className="mt-1 text-lg font-semibold text-foreground/90 sm:text-xl">
                  {invoice.customerName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(invoice.invoiceDate)}
                  {invoice.dueDate ? (
                    <span className="text-muted-foreground/80">
                      {" "}
                      · Due {formatDate(invoice.dueDate)}
                    </span>
                  ) : null}
                </p>
              </div>
              <Badge
                variant={paymentStatusBadgeVariant(invoice.paymentStatus)}
                className="px-3 py-1 text-xs font-bold uppercase tracking-wide"
              >
                {paymentStatusLabel(invoice.paymentStatus)}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-[#0070C0]/10 pt-4 dark:border-white/10">
            <Button
              className="h-9 bg-[#0070C0] shadow-sm hover:bg-[#005499] dark:bg-[#0070C0] dark:hover:bg-[#005499]"
              asChild
            >
              <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                <Printer className="mr-2 h-4 w-4" />
                Print PDF
              </a>
            </Button>
            <Button variant="outline" className="h-9 border-[#0070C0]/20 bg-white/60 backdrop-blur-sm dark:bg-card/50" onClick={onWhatsApp}>
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
          </div>
        </div>
      </section>

      {/* Customer info */}
      <section className={cn(glassCard, "p-4 sm:p-5")}>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#0070C0] dark:text-[#38bdf8]">
          Bill To
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem icon={User} label="Customer Name" value={invoice.customerName} />
          <InfoItem icon={Phone} label="Phone Number" value={invoice.customerMobile || "—"} />
          <InfoItem icon={Calendar} label="Invoice Date" value={formatDate(invoice.invoiceDate)} />
          <InfoItem
            icon={CreditCard}
            label="Payment Method"
            value={paymentMethodLabel(invoice.paymentMethod)}
          />
          <InfoItem icon={Hash} label="Invoice Number" value={invoice.invoiceNumber} />
          <InfoItem
            icon={FileText}
            label="Status"
            value={
              <Badge variant={paymentStatusBadgeVariant(invoice.paymentStatus)} className="mt-0.5">
                {paymentStatusLabel(invoice.paymentStatus)}
              </Badge>
            }
          />
        </div>
      </section>

      {/* Items + sidebar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-5">
        {/* Items */}
        <section className={cn(glassCard, "overflow-hidden lg:col-span-3")}>
          <div className="border-b border-[#E2E8F0] px-4 py-3 dark:border-white/10 sm:px-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0070C0] dark:text-[#38bdf8]">
              Invoice Items
            </h2>
            <p className="text-xs text-muted-foreground">
              {invoice.items.length} line item{invoice.items.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#E8F4FE]/60 dark:border-white/10 dark:bg-[#0070C0]/10">
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-[#0070C0] dark:text-[#38bdf8]">
                    #
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-[#0070C0] dark:text-[#38bdf8]">
                    Description
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-[#0070C0] dark:text-[#38bdf8]">
                    Qty
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-[#0070C0] dark:text-[#38bdf8]">
                    Rate
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-[#0070C0] dark:text-[#38bdf8]">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => {
                  const packagePeriod =
                    isCoachingPackage(item.itemType) &&
                    (item.packageStartDate || item.packageEndDate) ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.packageStartDate ? formatDate(item.packageStartDate) : "—"}
                        {" → "}
                        {item.packageEndDate ? formatDate(item.packageEndDate) : "—"}
                      </span>
                    ) : null;

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "border-b border-[#E2E8F0]/80 transition-colors last:border-0 hover:bg-[#0070C0]/[0.03] dark:border-white/5",
                        index % 2 === 1 && "bg-[#F8FAFC]/80 dark:bg-white/[0.02]"
                      )}
                    >
                      <td className="px-4 py-3 align-top tabular-nums text-muted-foreground">
                        {item.slNo}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-foreground">{item.description}</p>
                        <p className="text-xs text-muted-foreground">{item.itemType}</p>
                        {packagePeriod}
                      </td>
                      <td className="px-4 py-3 text-right align-top tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right align-top tabular-nums">
                        {formatCurrency(Number(item.unitPrice))}
                      </td>
                      <td className="px-4 py-3 text-right align-top font-semibold tabular-nums text-foreground">
                        {formatCurrency(Number(item.amount))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Summary + Payment */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Totals */}
          <section className={cn(glassCard, "p-4 sm:p-5")}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#0070C0] dark:text-[#38bdf8]">
              Summary
            </h2>
            <div className="space-y-0.5">
              <SummaryLine
                label="Subtotal"
                value={formatCurrency(Number(invoice.subtotal))}
              />
              {showGst ? (
                <>
                  <SummaryLine
                    label={`CGST (${Number(invoice.cgstRate)}%)`}
                    value={formatCurrency(Number(invoice.cgstAmount))}
                    muted
                  />
                  <SummaryLine
                    label={`SGST (${Number(invoice.sgstRate)}%)`}
                    value={formatCurrency(Number(invoice.sgstAmount))}
                    muted
                  />
                </>
              ) : null}
              <SummaryLine
                label="Amount Paid"
                value={formatCurrency(Number(invoice.amountPaid))}
                muted
              />
              <SummaryLine
                label="Balance Due"
                value={formatCurrency(Number(invoice.amountRemaining))}
                bold={Number(invoice.amountRemaining) > 0}
              />
            </div>

            <div className="mt-4 overflow-hidden rounded-xl bg-gradient-to-r from-[#0070C0] to-[#0EA5E9] p-4 text-white shadow-[0_4px_20px_rgba(0,112,192,0.35)]">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">
                Grand Total
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
                {formatCurrency(Number(invoice.grandTotal))}
              </p>
            </div>
          </section>

          {/* Payment */}
          <section className={cn(glassCard, "border p-4 sm:p-5", paymentAccent.card)}>
            <div className="mb-3 flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  paymentAccent.icon
                )}
              >
                <Wallet className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Payment
              </h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Payment Status</span>
                <Badge variant={paymentStatusBadgeVariant(invoice.paymentStatus)}>
                  {paymentStatusLabel(invoice.paymentStatus)}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-semibold">{paymentMethodLabel(invoice.paymentMethod)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(Number(invoice.amountPaid))}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-black/5 pt-3 text-sm dark:border-white/10">
                <span className="font-medium text-muted-foreground">Balance Due</span>
                <span
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    Number(invoice.amountRemaining) > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {formatCurrency(Number(invoice.amountRemaining))}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Amount in words */}
      <section
        className={cn(
          glassCard,
          "border-l-4 border-l-[#0070C0] p-4 sm:p-5 dark:border-l-[#38bdf8]"
        )}
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#0070C0] dark:text-[#38bdf8]">
          Amount in Words
        </p>
        <p className="mt-2 text-base font-medium leading-relaxed text-foreground sm:text-lg">
          {invoice.amountInWords}
        </p>
      </section>
    </div>
  );
}
