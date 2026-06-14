"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import {
  calculateInvoiceTotals,
  calculatePaymentAmounts,
  lineTotal,
} from "@/lib/invoice-utils";
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  paymentStatusLabel,
  paymentMethodLabel,
  isCoachingPackage,
  type PaymentStatusType,
} from "@/lib/constants";
import { useInvoiceStore } from "@/stores/invoice-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, cn } from "@/lib/utils";
import { customerToSearchResult } from "@/lib/customer-search";
import { readApiResponse } from "@/lib/api-error";
import { InvoiceWizardShell } from "./invoice-wizard-shell";
import { InvoiceWizardNav } from "./invoice-wizard-nav";
import { InvoiceSummaryPanel, InvoiceSummaryMobileBar } from "./invoice-summary-panel";
import { InvoiceItemRow } from "./invoice-item-row";
import {
  InvoiceCustomerStep,
  validateCustomerStep,
} from "@/components/invoices/invoice-customer-step";
import { sanitizeMobileInput } from "@/lib/mobile-input";
import { CatalogItemPicker } from "@/components/catalog/catalog-item-picker";

const STEPS = ["Customer", "Items", "Payment", "Review"] as const;
type Step = 0 | 1 | 2 | 3;

function StepCard({
  title,
  description,
  children,
  headerAction,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}) {
  return (
    <div className="glass-panel relative overflow-visible rounded-xl shadow-[var(--shadow-card)]">
      <div className="h-0.5 bg-gradient-to-r from-primary/80 via-primary/50 to-primary/30" />
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {headerAction}
      </div>
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </div>
  );
}

export default function InvoiceWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);
  const [stepBusy, setStepBusy] = useState(false);

  const {
    customerId,
    customerName,
    customerMobile,
    customerAddress,
    customerGst,
    invoiceDate,
    gstEnabled,
    cgstRate,
    sgstRate,
    paymentStatus,
    paymentMethod,
    amountPaid,
    items,
    setCustomerName,
    setCustomerMobile,
    setSelectedCustomer,
    setGstEnabled,
    setCgstRate,
    setSgstRate,
    setPaymentStatus,
    setPaymentMethod,
    setAmountPaid,
    addItem,
    addSubscriptionFromCatalog,
    addProductFromCatalog,
    reset,
  } = useInvoiceStore();

  const totals = calculateInvoiceTotals(items, { gstEnabled, cgstRate, sgstRate });
  const payment = calculatePaymentAmounts(
    totals.grandTotal,
    paymentStatus,
    paymentStatus === "PARTIALLY_PAID" ? amountPaid : undefined
  );

  useEffect(() => {
    fetch("/api/settings/billing-defaults")
      .then((r) => r.json())
      .then((s) => {
        setGstEnabled(s.gstEnabled ?? true);
        setCgstRate(Number(s.defaultCgstRate ?? 0));
        setSgstRate(Number(s.defaultSgstRate ?? 0));
      });
    const prefillName = searchParams.get("customerName");
    const prefillMobile = searchParams.get("customerMobile");
    const prefillCustomerId = searchParams.get("customerId");
    if (prefillCustomerId) {
      fetch(`/api/customers/${prefillCustomerId}`)
        .then((r) => r.json())
        .then((c) => {
          if (c?.id) {
            setSelectedCustomer(customerToSearchResult(c));
          }
        });
    } else {
      if (prefillName) setCustomerName(prefillName);
      if (prefillMobile) setCustomerMobile(prefillMobile);
    }
    return () => reset();
  }, [searchParams, setCustomerName, setCustomerMobile, setSelectedCustomer, setGstEnabled, setCgstRate, setSgstRate, reset]);

  const goTo = (next: Step) => setStep(next);

  const validateStep = (s: Step): boolean => {
    if (s === 0 && !validateCustomerStep(customerName, customerMobile)) {
      return false;
    }
    if (s === 1) {
      if (items.length === 0) {
        toast.error("Add at least one item");
        return false;
      }
      if (items.some((item) => !item.description.trim())) {
        toast.error("Enter description for all items");
        return false;
      }
      if (items.some((item) => item.quantity < 1)) {
        toast.error("Enter quantity of at least 1 for all items");
        return false;
      }
      if (items.some((item) => item.unitPrice <= 0)) {
        toast.error("Enter price for all items");
        return false;
      }
    }
    if (s === 2) {
      if (!paymentMethod) {
        toast.error("Select payment mode");
        return false;
      }
      if (paymentStatus === "PARTIALLY_PAID" && amountPaid <= 0) {
        toast.error("Enter amount paid");
        return false;
      }
      if (paymentStatus === "PARTIALLY_PAID" && amountPaid > totals.grandTotal) {
        toast.error("Amount paid cannot exceed grand total");
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    if (step < 3) goTo((step + 1) as Step);
  };

  const prevStep = () => {
    if (step > 0) goTo((step - 1) as Step);
  };

  const submitInvoice = async () => {
    if (!validateCustomerStep(customerName, customerMobile) || !validateStep(1) || !validateStep(2)) {
      return;
    }

    for (const item of items) {
      if (!isCoachingPackage(item.itemType)) continue;
      if (item.packageStartDate && item.packageEndDate) {
        if (new Date(item.packageEndDate) < new Date(item.packageStartDate)) {
          toast.error("Package end date must be on or after start date");
          return;
        }
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || undefined,
          customerName: customerName.trim(),
          customerMobile: sanitizeMobileInput(customerMobile) || undefined,
          customerAddress: customerAddress.trim() || undefined,
          customerGst: customerGst.trim() || undefined,
          invoiceDate,
          paymentStatus,
          paymentMethod,
          gstEnabled,
          cgstRate,
          sgstRate,
          amountPaid:
            paymentStatus === "PARTIALLY_PAID"
              ? amountPaid
              : paymentStatus === "PENDING"
                ? 0
                : undefined,
          items: items.map((item) => ({
            itemType: item.itemType,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            packageStartDate: isCoachingPackage(item.itemType)
              ? item.packageStartDate || undefined
              : undefined,
            packageEndDate: isCoachingPackage(item.itemType)
              ? item.packageEndDate || undefined
              : undefined,
            subscriptionPlanId: item.subscriptionPlanId,
            planNameSnapshot: item.planNameSnapshot,
            descriptionSnapshot: item.descriptionSnapshot,
            durationSnapshot: item.durationSnapshot,
            durationValueSnapshot: item.durationValueSnapshot,
            durationUnitSnapshot: item.durationUnitSnapshot,
            usageDaysSnapshot: item.usageDaysSnapshot,
            feesSnapshot: item.feesSnapshot,
          })),
        }),
      });

      const result = await readApiResponse<{ id: string }>(
        res,
        "Failed to create invoice"
      );

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("Invoice created");
      router.push(`/invoices/${result.data.id}`);
    } catch (e) {
      console.error("[submitInvoice]", e);
      toast.error("Failed to create invoice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <InvoiceWizardShell>
      <header className="mb-6 flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-lg border-border/80"
          asChild
        >
          <Link href="/invoices" aria-label="Back to invoices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden
        >
          <Receipt className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            New Invoice
          </h1>
          <p className="text-sm text-muted-foreground">
            MR Academy · Front Desk Billing
          </p>
        </div>
      </header>

      <nav
        className="glass-panel mb-5 flex flex-wrap items-center justify-center gap-1 rounded-xl px-2 py-1.5"
        aria-label="Invoice steps"
      >
        {STEPS.map((label, i) => {
          const idx = i as Step;
          const active = step === idx;
          const done = step > idx;
          return (
            <span key={label} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight className="hidden h-4 w-4 text-primary/40 sm:block" aria-hidden />
              )}
              <button
                type="button"
                disabled={idx > step}
                onClick={() => idx < step && goTo(idx)}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:text-sm",
                  active && "bg-primary text-primary-foreground shadow-sm",
                  done && !active && "text-primary hover:bg-primary/10",
                  !active && !done && "text-muted-foreground",
                  idx > step && "cursor-not-allowed opacity-40"
                )}
              >
                {label}
              </button>
            </span>
          );
        })}
      </nav>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-6">
        <div className="lg:col-span-3">
          <div key={step} className="transition-opacity duration-200">
            {step === 0 && (
              <StepCard title="Customer" description="Name and mobile — pick existing or add new">
                <InvoiceCustomerStep />
              </StepCard>
            )}

            {step === 1 && (
              <StepCard
                title="Invoice Items"
                description="Pick a subscription or product first. Use Add Custom Item for each additional line."
              >
                <div className="mb-4 grid gap-4 sm:grid-cols-2">
                  <CatalogItemPicker
                    type="subscription"
                    label="Select Subscription Plan"
                    placeholder="Search subscription plans…"
                    onSelect={(item) => {
                      if (!("duration" in item)) return;
                      const added = addSubscriptionFromCatalog({
                        id: item.id,
                        planName: item.name,
                        description: item.description ?? null,
                        duration: item.duration,
                        durationValue: item.durationValue ?? 1,
                        durationUnit: item.durationUnit ?? "MONTHS",
                        usageDays: item.usageDays ?? null,
                        fees: item.price,
                        isActive: true,
                        createdAt: "",
                        updatedAt: "",
                      });
                      if (!added) {
                        toast.error("Press Add Custom Item before adding another line");
                        return;
                      }
                      toast.success(`Added ${item.name}`);
                    }}
                  />
                  <CatalogItemPicker
                    type="product"
                    label="Add Product"
                    placeholder="Select product…"
                    onSelect={(item) => {
                      const added = addProductFromCatalog({
                        name: item.name,
                        price: item.price,
                      });
                      if (!added) {
                        toast.error("Press Add Custom Item before adding another line");
                        return;
                      }
                      toast.success(`Added ${item.name}`);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  {items.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-primary/25 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                      Select a subscription or product above to add your first line item.
                    </p>
                  ) : (
                    items.map((item, index) => (
                      <InvoiceItemRow
                        key={index}
                        index={index}
                        item={item}
                        canRemove
                      />
                    ))
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 h-9 w-full border-dashed border-primary/30 text-sm"
                  onClick={() => addItem()}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Custom Item
                </Button>
              </StepCard>
            )}

            {step === 2 && (
              <StepCard title="Payment" description="Mode and collection status">
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block text-sm font-semibold">Payment Mode *</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {PAYMENT_METHODS.map((method) => (
                        <Button
                          key={method}
                          type="button"
                          variant={paymentMethod === method ? "default" : "outline"}
                          className={cn(
                            "h-10 text-sm font-medium",
                            paymentMethod === method && "shadow-sm"
                          )}
                          onClick={() => setPaymentMethod(method)}
                        >
                          {paymentMethodLabel(method)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm font-semibold">Payment Status</Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {PAYMENT_STATUSES.map((status) => (
                        <Button
                          key={status}
                          type="button"
                          variant={paymentStatus === status ? "default" : "outline"}
                          className="h-10 justify-center text-sm"
                          onClick={() => setPaymentStatus(status as PaymentStatusType)}
                        >
                          {paymentStatusLabel(status)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {paymentStatus === "PARTIALLY_PAID" && (
                    <div className="grid gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-sm">Amount Paid</Label>
                        <Input
                          className="h-10"
                          type="number"
                          min={0}
                          max={totals.grandTotal}
                          value={amountPaid || ""}
                          onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                        />
                      </div>
                      <div className="flex items-end justify-between sm:flex-col sm:items-stretch sm:justify-end">
                        <span className="text-sm text-muted-foreground">Remaining</span>
                        <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                          {formatCurrency(payment.amountRemaining)}
                        </span>
                      </div>
                    </div>
                  )}
                  {paymentStatus === "PENDING" && (
                    <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                      Balance due:{" "}
                      <strong>{formatCurrency(totals.grandTotal)}</strong>
                    </p>
                  )}
                  {paymentStatus === "FULLY_PAID" && (
                    <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      Collecting {formatCurrency(totals.grandTotal)}
                    </p>
                  )}
                </div>
              </StepCard>
            )}

            {step === 3 && (
              <StepCard title="Review" description="Confirm before generating">
                <div className="grid gap-3 sm:grid-cols-2">
                  <section className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 dark:border-primary/15 dark:bg-card/60">
                    <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">
                      Customer
                    </h4>
                    <p className="font-medium">{customerName}</p>
                    {customerMobile && (
                      <p className="text-sm text-muted-foreground">{customerMobile}</p>
                    )}
                  </section>
                  <section className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 dark:border-primary/15 dark:bg-card/60">
                    <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">
                      Payment
                    </h4>
                    <p className="text-sm">
                      {paymentMethod ? paymentMethodLabel(paymentMethod) : "—"} ·{" "}
                      {paymentStatusLabel(paymentStatus)}
                    </p>
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      Due {formatCurrency(payment.amountRemaining)}
                    </p>
                  </section>
                  <section className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 sm:col-span-2 dark:border-primary/15 dark:bg-card/60">
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
                      Items ({items.length})
                    </h4>
                    <ul className="divide-y divide-border/60">
                      {items.map((item, i) => (
                        <li key={i} className="flex justify-between gap-2 py-1.5 text-sm">
                          <span className="min-w-0 truncate">
                            {item.description}{" "}
                            <span className="text-muted-foreground">×{item.quantity}</span>
                          </span>
                          <span className="shrink-0 font-medium">
                            {formatCurrency(lineTotal(item))}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="invoice-total-aqua mt-3 flex justify-between rounded-lg px-3 py-2.5 font-bold">
                      <span>Grand Total</span>
                      <span className="invoice-total-value text-lg tabular-nums">
                        {formatCurrency(totals.grandTotal)}
                      </span>
                    </div>
                  </section>
                </div>
              </StepCard>
            )}
          </div>

          <InvoiceWizardNav
            step={step}
            loading={loading || stepBusy}
            onBack={prevStep}
            onNext={nextStep}
            onSubmit={submitInvoice}
          />

          <InvoiceSummaryMobileBar className="mt-4" />
        </div>

        <div className="hidden lg:col-span-1 lg:block">
          <InvoiceSummaryPanel />
        </div>
      </div>
    </InvoiceWizardShell>
  );
}
