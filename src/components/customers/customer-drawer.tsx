"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { FileText, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { COACHING_PACKAGE_TYPE } from "@/lib/constants";
import {
  paymentStatusLabel,
  paymentStatusBadgeVariant,
  paymentMethodLabel,
} from "@/lib/constants";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import {
  buildCustomerInvoiceIndex,
  getDisplayStatus,
  type CustomerListRow,
  type InvoiceIndexEntry,
} from "@/lib/customer-list-utils";

type CustomerDetail = CustomerListRow & {
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    grandTotal: number | string;
    amountPaid: number | string;
    amountRemaining: number | string;
    paymentStatus: string;
    paymentMethod?: string;
    items: Array<{
      itemType: string;
      description: string;
      packageStartDate?: string | null;
      packageEndDate?: string | null;
    }>;
  }>;
  stats: {
    totalInvoices: number;
    totalAmountBilled: number;
    totalAmountPaid: number;
    outstandingBalance: number;
    lastInvoiceDate: string | null;
  };
};

interface CustomerDrawerProps {
  customer: CustomerListRow | null;
  invoiceIndex: Map<string, InvoiceIndexEntry>;
  onClose: () => void;
  onEdit: (customer: CustomerListRow) => void;
}

function currentServices(detail: CustomerDetail) {
  const services = new Set<string>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const invoice of detail.invoices) {
    for (const item of invoice.items) {
      if (item.itemType === COACHING_PACKAGE_TYPE) {
        const end = item.packageEndDate ? new Date(item.packageEndDate) : null;
        if (!end || end >= today) {
          services.add(
            item.description?.trim() ? `Coaching — ${item.description}` : "Coaching Package"
          );
        } else {
          services.add("Coaching Package (Renewal Due)");
        }
      } else {
        const label = item.description?.trim() || item.itemType;
        if (label.toLowerCase().includes("swim") || item.itemType !== COACHING_PACKAGE_TYPE) {
          services.add(label);
        }
      }
    }
  }

  return Array.from(services);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

export function CustomerDrawer({
  customer,
  invoiceIndex,
  onClose,
  onEdit,
}: CustomerDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const open = Boolean(customer);

  const detailUrl = customer ? `/api/customers/${customer.id}` : "";
  const { data: detail, isLoading } = useCachedFetch<CustomerDetail>(detailUrl, {
    enabled: open,
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const services = useMemo(() => (detail ? currentServices(detail) : []), [detail]);

  const display = useMemo(() => {
    if (!customer) return null;
    const index =
      invoiceIndex.get(customer.id) ??
      (detail
        ? buildCustomerInvoiceIndex(
            detail.invoices.map((inv) => ({
              customerId: customer.id,
              paymentStatus: inv.paymentStatus,
              items: inv.items,
            }))
          ).get(customer.id)
        : undefined);
    return getDisplayStatus(customer, index);
  }, [customer, invoiceIndex, detail]);

  const recentPayments = useMemo(() => {
    if (!detail?.invoices?.length) return [];
    return [...detail.invoices]
      .filter((inv) => Number(inv.amountPaid) > 0)
      .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
      .slice(0, 5);
  }, [detail]);

  if (!open || !mounted || !customer) return null;

  const invoiceCount = detail?.stats.totalInvoices ?? customer._count.invoices;
  const amountPaid = detail?.stats.totalAmountPaid ?? 0;
  const amountPending = detail?.stats.outstandingBalance ?? 0;
  const phone = (detail?.mobile ?? customer.mobile)?.trim() || null;

  return createPortal(
    <div className="fixed inset-0 z-[180] flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close customer details"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-drawer-title"
        className={cn(
          "relative flex h-full w-full max-w-md flex-col border-l border-border",
          "bg-card/95 shadow-2xl backdrop-blur-xl"
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Customer details
            </p>
            <h2 id="customer-drawer-title" className="truncate text-lg font-bold text-foreground">
              {customer.name}
            </h2>
            {phone ? (
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="mt-1 block truncate text-sm font-medium text-primary hover:underline"
              >
                {phone}
              </a>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No mobile on file</p>
            )}
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isLoading && !detail ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading profile…</p>
          ) : (
            <div className="space-y-6">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Customer Name
                  </dt>
                  <dd className="mt-0.5 font-semibold">{customer.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Mobile Number
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {phone ? (
                      <a
                        href={`tel:${phone.replace(/\s/g, "")}`}
                        className="text-primary hover:underline"
                      >
                        {phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Customer ID
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm">{customer.membershipId}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </dt>
                  <dd className="mt-1">
                    {display ? <Badge variant={display.variant}>{display.label}</Badge> : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Joined Date
                  </dt>
                  <dd className="mt-0.5 font-medium">{formatDate(customer.dateJoined)}</dd>
                </div>
              </dl>

              <div>
                <SectionTitle>Current Services</SectionTitle>
                {services.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No active services on record.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {services.map((service) => (
                      <li
                        key={service}
                        className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm"
                      >
                        {service}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                <SectionTitle>Invoice Count</SectionTitle>
                <p className="mt-1 text-2xl font-bold tabular-nums">{invoiceCount}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/60 bg-muted/25 p-3">
                  <p className="text-xs text-muted-foreground">Amount Paid</p>
                  <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(amountPaid)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/25 p-3">
                  <p className="text-xs text-muted-foreground">Amount Pending</p>
                  <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                    {formatCurrency(amountPending)}
                  </p>
                </div>
              </div>

              <div>
                <SectionTitle>Recent Payments</SectionTitle>
                {recentPayments.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No payments recorded yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {recentPayments.map((inv) => (
                      <li
                        key={inv.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{formatDate(inv.invoiceDate)}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {inv.invoiceNumber}
                            {inv.paymentMethod
                              ? ` · ${paymentMethodLabel(inv.paymentMethod)}`
                              : ""}
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(Number(inv.amountPaid))}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <SectionTitle>Invoice History</SectionTitle>
                {!detail?.invoices?.length ? (
                  <p className="mt-2 text-sm text-muted-foreground">No invoices yet.</p>
                ) : (
                  <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
                    {detail.invoices.map((inv) => (
                      <li
                        key={inv.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="text-sm font-semibold text-primary hover:underline"
                          >
                            {inv.invoiceNumber}
                          </Link>
                          <p className="text-xs text-muted-foreground">{formatDate(inv.invoiceDate)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums">
                            {formatCurrency(Number(inv.grandTotal))}
                          </p>
                          <Badge variant={paymentStatusBadgeVariant(inv.paymentStatus)} className="mt-1">
                            {paymentStatusLabel(inv.paymentStatus)}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-border px-5 py-4">
          <Button asChild className="flex-1">
            <Link href="/invoices/new">
              <FileText className="mr-2 h-4 w-4" />
              Create Invoice
            </Link>
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => onEdit(customer)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Customer
          </Button>
        </div>
      </aside>
    </div>,
    document.body
  );
}
