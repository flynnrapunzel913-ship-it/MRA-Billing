"use client";

import { calculateInvoiceTotals, calculatePaymentAmounts } from "@/lib/invoice-utils";
import { paymentStatusLabel } from "@/lib/constants";
import { useInvoiceStore } from "@/stores/invoice-store";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

function SummaryRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2 text-sm", className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function InvoiceSummaryPanel({ className }: { className?: string }) {
  const {
    items,
    gstEnabled,
    cgstRate,
    sgstRate,
    paymentStatus,
    amountPaid,
    setCgstRate,
    setSgstRate,
  } = useInvoiceStore();

  const totals = calculateInvoiceTotals(items, { gstEnabled, cgstRate, sgstRate });
  const payment = calculatePaymentAmounts(
    totals.grandTotal,
    paymentStatus,
    paymentStatus === "PARTIALLY_PAID" ? amountPaid : undefined
  );

  const itemCount = items.filter((i) => i.description.trim()).length || items.length;

  return (
    <aside
      className={cn(
        "sticky top-4 overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-b from-card/95 via-card/90 to-[#0070C0]/8 p-3 shadow-[0_8px_32px_rgba(0,112,192,0.12)] backdrop-blur-lg dark:shadow-[0_8px_32px_rgba(0,112,192,0.18)]",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#38bdf8]/20 blur-2xl" aria-hidden />
      <div className="relative">
        <div className="mb-2 border-b border-primary/15 pb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
            Live Summary
          </h3>
        </div>

        <div className="space-y-1.5">
          <SummaryRow label="Items" value={String(itemCount)} />
          <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal)} />

          {gstEnabled && (
            <>
              <div className="flex items-center justify-between gap-1 text-sm">
                <span className="text-muted-foreground">CGST</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    className="h-7 w-14 border-primary/20 px-1 text-right text-xs font-semibold"
                    value={cgstRate}
                    onChange={(e) => setCgstRate(Number(e.target.value) || 0)}
                  />
                  <span className="text-muted-foreground">%</span>
                  <span className="min-w-[4.5rem] text-right font-medium tabular-nums">
                    {formatCurrency(totals.cgstAmount)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-1 text-sm">
                <span className="text-muted-foreground">SGST</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    className="h-7 w-14 border-primary/20 px-1 text-right text-xs font-semibold"
                    value={sgstRate}
                    onChange={(e) => setSgstRate(Number(e.target.value) || 0)}
                  />
                  <span className="text-muted-foreground">%</span>
                  <span className="min-w-[4.5rem] text-right font-medium tabular-nums">
                    {formatCurrency(totals.sgstAmount)}
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="mt-2 rounded-lg border border-primary/25 bg-gradient-to-r from-primary/15 via-[#38bdf8]/10 to-primary/5 px-2.5 py-2 shadow-[0_0_24px_rgba(0,112,192,0.2)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Grand Total</span>
              <span className="text-lg font-bold tabular-nums text-primary">
                {formatCurrency(totals.grandTotal)}
              </span>
            </div>
          </div>

          <SummaryRow label="Payment" value={paymentStatusLabel(paymentStatus)} />
          <SummaryRow
            label="Balance Due"
            value={formatCurrency(payment.amountRemaining)}
            className={
              payment.amountRemaining > 0 ? "[&_span:last-child]:text-amber-600 dark:[&_span:last-child]:text-amber-400" : ""
            }
          />
        </div>
      </div>
    </aside>
  );
}

export function InvoiceSummaryMobileBar({ className }: { className?: string }) {
  const { items, gstEnabled, cgstRate, sgstRate, paymentStatus, amountPaid } = useInvoiceStore();
  const totals = calculateInvoiceTotals(items, { gstEnabled, cgstRate, sgstRate });
  const payment = calculatePaymentAmounts(
    totals.grandTotal,
    paymentStatus,
    paymentStatus === "PARTIALLY_PAID" ? amountPaid : undefined
  );

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-gradient-to-r from-card/90 to-primary/5 px-3 py-2 text-sm shadow-md backdrop-blur-md lg:hidden",
        className
      )}
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Total</p>
        <p className="text-lg font-bold text-primary">{formatCurrency(totals.grandTotal)}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] text-muted-foreground">Balance</p>
        <p className="font-semibold text-amber-600 dark:text-amber-400">
          {formatCurrency(payment.amountRemaining)}
        </p>
      </div>
    </div>
  );
}
