"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { calculateInvoiceTotals, calculatePaymentAmounts, lineTotal } from "@/lib/invoice-utils";
import {
  ITEM_TYPES,
  PAYMENT_METHODS,
  paymentStatusLabel,
  paymentMethodLabel,
  isCoachingPackage,
} from "@/lib/constants";
import { useInvoiceStore } from "@/stores/invoice-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [gstConfig, setGstConfig] = useState({
    gstEnabled: true,
    cgstRate: 9,
    sgstRate: 9,
  });

  const {
    customerName,
    customerMobile,
    customerAddress,
    saveCustomer,
    invoiceDate,
    paymentStatus,
    paymentMethod,
    amountPaid,
    items,
    setCustomerName,
    setCustomerMobile,
    setCustomerAddress,
    setSaveCustomer,
    setInvoiceDate,
    setPaymentStatus,
    setPaymentMethod,
    setAmountPaid,
    addItem,
    removeItem,
    reset,
  } = useInvoiceStore();

  const totals = calculateInvoiceTotals(items, gstConfig);
  const payment = calculatePaymentAmounts(
    totals.grandTotal,
    paymentStatus,
    paymentStatus === "PARTIALLY_PAID" ? amountPaid : totals.grandTotal
  );

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        setGstConfig({
          gstEnabled: s.gstEnabled ?? true,
          cgstRate: Number(s.defaultCgstRate ?? 9),
          sgstRate: Number(s.defaultSgstRate ?? 9),
        });
      });
    const prefillName = searchParams.get("customerName");
    const prefillMobile = searchParams.get("customerMobile");
    const prefillAddress = searchParams.get("customerAddress");
    if (prefillName) setCustomerName(prefillName);
    if (prefillMobile) setCustomerMobile(prefillMobile);
    if (prefillAddress) setCustomerAddress(prefillAddress);
    return () => reset();
  }, [searchParams, setCustomerName, setCustomerMobile, reset]);

  const submitInvoice = async () => {
    if (!customerName.trim()) {
      toast.error("Enter customer name");
      return;
    }
    if (items.some((item) => !item.description.trim())) {
      toast.error("Enter description for all items");
      return;
    }
    if (items.some((item) => item.unitPrice <= 0)) {
      toast.error("Enter unit price for all items");
      return;
    }
    if (paymentStatus === "PARTIALLY_PAID" && amountPaid <= 0) {
      toast.error("Enter amount paid");
      return;
    }
    if (paymentStatus === "PARTIALLY_PAID" && amountPaid > totals.grandTotal) {
      toast.error("Amount paid cannot exceed grand total");
      return;
    }
    if (!paymentMethod) {
      toast.error("Select mode of payment: UPI, Cash, Card, or Others");
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
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: customerName.trim(),
        customerMobile: customerMobile.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        saveCustomer,
        invoiceDate,
        paymentStatus,
        paymentMethod,
        amountPaid: paymentStatus === "PARTIALLY_PAID" ? amountPaid : totals.grandTotal,
        items: items.map((item) => ({
          ...item,
          packageStartDate: isCoachingPackage(item.itemType) ? item.packageStartDate || undefined : undefined,
          packageEndDate: isCoachingPackage(item.itemType) ? item.packageEndDate || undefined : undefined,
        })),
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || "Failed to create invoice");
      return;
    }

    const invoice = await res.json();
    toast.success("Invoice created");
    router.push(`/invoices/${invoice.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/invoices"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Quick Invoice</h2>
          <p className="text-sm text-muted-foreground">Fast billing — type details, enter prices, generate</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Step 1 — Customer</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Customer Name *</Label>
              <Input
                placeholder="Enter customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone (optional)</Label>
              <Input
                placeholder="Mobile number"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Date</Label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address (optional)</Label>
              <Input
                placeholder="Customer address"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={saveCustomer}
                onChange={(e) => setSaveCustomer(e.target.checked)}
              />
              Save customer to database
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
            {totals.gstEnabled && (
              <>
                <div className="flex justify-between"><span>CGST ({totals.cgstRate}%)</span><span>{formatCurrency(totals.cgstAmount)}</span></div>
                <div className="flex justify-between"><span>SGST ({totals.sgstRate}%)</span><span>{formatCurrency(totals.sgstAmount)}</span></div>
              </>
            )}
            <div className="flex justify-between border-t pt-2 font-bold text-primary">
              <span>Grand Total</span><span>{formatCurrency(totals.grandTotal)}</span>
            </div>

            <div className="space-y-2 border-t pt-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Mode of Payment *
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <Button
                    key={method}
                    type="button"
                    variant={paymentMethod === method ? "default" : "outline"}
                    size="sm"
                    className="h-9"
                    onClick={() => setPaymentMethod(method)}
                  >
                    {paymentMethodLabel(method)}
                  </Button>
                ))}
              </div>
              {!paymentMethod && (
                <p className="text-xs text-amber-600">Required before generating invoice</p>
              )}
            </div>

            <div className="flex justify-between"><span>Payment</span><span>{paymentStatusLabel(paymentStatus)}</span></div>
            {paymentStatus === "FULLY_PAID" ? (
              <div className="flex justify-between font-medium"><span>Total Amount</span><span>{formatCurrency(totals.grandTotal)}</span></div>
            ) : (
              <>
                <div className="flex justify-between"><span>Amount Paid</span><span>{formatCurrency(payment.amountPaid)}</span></div>
                <div className="flex justify-between text-amber-600"><span>Amount Remaining</span><span>{formatCurrency(payment.amountRemaining)}</span></div>
              </>
            )}
            <Button className="mt-4 w-full" size="lg" onClick={submitInvoice} disabled={loading}>
              {loading ? "Generating..." : "Generate Invoice"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Step 2 — Invoice Items</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => addItem("Coaching Package")}>
              <Plus className="mr-1 h-4 w-4" />Coaching
            </Button>
            <Button variant="outline" size="sm" onClick={() => addItem("Accessories / Products")}>
              <Plus className="mr-1 h-4 w-4" />Product
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden grid-cols-12 gap-2 text-xs font-medium text-muted-foreground md:grid">
            <div className="col-span-2">Item Type</div>
            <div className="col-span-4">Description</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-2">Unit Price</div>
            <div className="col-span-2">Total</div>
            <div className="col-span-1" />
          </div>
          {items.map((item, index) => (
            <div key={index} className="grid gap-2 rounded-lg border p-3 md:grid-cols-12 md:items-center">
              <div className="md:col-span-2">
                <Label className="mb-1 md:hidden">Item Type</Label>
                <Select
                  value={item.itemType}
                  onValueChange={(v) =>
                    useInvoiceStore.getState().updateItem(index, {
                      ...item,
                      itemType: v,
                      packageStartDate: isCoachingPackage(v) ? item.packageStartDate : "",
                      packageEndDate: isCoachingPackage(v) ? item.packageEndDate : "",
                    })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-4">
                <Label className="mb-1 md:hidden">Description</Label>
                <Input
                  placeholder="e.g. Advanced Coaching, Goggles..."
                  value={item.description}
                  onChange={(e) =>
                    useInvoiceStore.getState().updateItem(index, {
                      ...item,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="md:col-span-1">
                <Label className="mb-1 md:hidden">Qty</Label>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    useInvoiceStore.getState().updateItem(index, {
                      ...item,
                      quantity: Number(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1 md:hidden">Unit Price</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={item.unitPrice || ""}
                  onChange={(e) =>
                    useInvoiceStore.getState().updateItem(index, {
                      ...item,
                      unitPrice: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between md:col-span-2">
                <span className="font-semibold">{formatCurrency(lineTotal(item))}</span>
              </div>
              <div className="flex justify-end md:col-span-1">
                <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              {isCoachingPackage(item.itemType) && (
                <div className="grid gap-2 border-t border-dashed pt-3 md:col-span-12 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Package start date (optional)</Label>
                    <Input
                      type="date"
                      value={item.packageStartDate || ""}
                      onChange={(e) =>
                        useInvoiceStore.getState().updateItem(index, {
                          ...item,
                          packageStartDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Package end date (optional)</Label>
                    <Input
                      type="date"
                      value={item.packageEndDate || ""}
                      onChange={(e) =>
                        useInvoiceStore.getState().updateItem(index, {
                          ...item,
                          packageEndDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Step 3 — Payment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Mode of Payment *</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAYMENT_METHODS.map((method) => (
                <Button
                  key={method}
                  type="button"
                  variant={paymentMethod === method ? "default" : "outline"}
                  onClick={() => setPaymentMethod(method)}
                >
                  {paymentMethodLabel(method)}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Payment Status</Label>
            <Select
              value={paymentStatus}
              onValueChange={(v) => setPaymentStatus(v as "FULLY_PAID" | "PARTIALLY_PAID")}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FULLY_PAID">Fully Paid</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {paymentStatus === "FULLY_PAID" ? (
            <div className="space-y-2">
              <Label>Total Amount</Label>
              <Input readOnly value={formatCurrency(totals.grandTotal)} className="bg-muted font-semibold" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Amount Paid</Label>
                <Input
                  type="number"
                  min={0}
                  max={totals.grandTotal}
                  value={amountPaid || ""}
                  onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount Remaining</Label>
                <Input readOnly value={formatCurrency(payment.amountRemaining)} className="bg-muted text-amber-600" />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
