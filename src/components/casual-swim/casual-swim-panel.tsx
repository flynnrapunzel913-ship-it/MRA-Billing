"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { readApiResponse } from "@/lib/api-error";
import { calculateCasualSwimBill, type CasualSwimRates } from "@/lib/casual-swim";
import type { CasualSwimBillDto } from "@/lib/casual-swim-bill";
import { CasualSwimReceiptActions } from "@/components/casual-swim/casual-swim-receipt-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CasualSwimConfig = CasualSwimRates;

type TodayBill = Pick<
  CasualSwimBillDto,
  "id" | "ticketNumber" | "hours" | "adultCount" | "childCount" | "totalAmount" | "createdAt"
>;

function formatTicketTime(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function QtyStepper({
  label,
  value,
  onChange,
  imageLabel,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  imageLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4">
      <div className="mb-3 flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {imageLabel ?? "Image"}
      </div>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="mt-2 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="text-center"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => onChange(value + 1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function CasualSwimPanel() {
  const [config, setConfig] = useState<CasualSwimConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [hours, setHours] = useState(1);
  const [adultCount, setAdultCount] = useState(0);
  const [childCount, setChildCount] = useState(0);
  const [capQty, setCapQty] = useState(0);
  const [shortsQty, setShortsQty] = useState(0);
  const [gogglesQty, setGogglesQty] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [createdBill, setCreatedBill] = useState<CasualSwimBillDto | null>(null);
  const [todayBills, setTodayBills] = useState<TodayBill[]>([]);

  const breakdown = useMemo(() => {
    if (!config) return null;
    return calculateCasualSwimBill(
      { hours, adultCount, childCount, capQty, shortsQty, gogglesQty },
      config
    );
  }, [config, hours, adultCount, childCount, capQty, shortsQty, gogglesQty]);

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch("/api/casual-swim/config");
      const result = await readApiResponse<{
        adultRatePerHour: number;
        childRatePerHour: number;
        capRentalPrice: number;
        shortsRentalPrice: number;
        gogglesRentalPrice: number;
      }>(res, "Failed to load rates");
      if (result.ok) {
        setConfig({
          adultRatePerHour: result.data.adultRatePerHour,
          childRatePerHour: result.data.childRatePerHour,
          capRentalPrice: result.data.capRentalPrice,
          shortsRentalPrice: result.data.shortsRentalPrice,
          gogglesRentalPrice: result.data.gogglesRentalPrice,
        });
      }
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadTodayBills = async () => {
    const res = await fetch("/api/casual-swim/bills");
    const result = await readApiResponse<{ bills: TodayBill[] }>(
      res,
      "Failed to load today's tickets"
    );
    if (result.ok) {
      setTodayBills(result.data.bills);
    }
  };

  useEffect(() => {
    void loadConfig();
    void loadTodayBills();
  }, []);

  const resetForm = () => {
    setHours(1);
    setAdultCount(0);
    setChildCount(0);
    setCapQty(0);
    setShortsQty(0);
    setGogglesQty(0);
  };

  const handleGenerate = async () => {
    if (!breakdown || breakdown.totalAmount <= 0) {
      toast.error("Add swimmers or rental items before generating a ticket");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/casual-swim/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hours,
          adultCount,
          childCount,
          capQty,
          shortsQty,
          gogglesQty,
        }),
      });
      const result = await readApiResponse<CasualSwimBillDto>(res, "Failed to generate ticket");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setCreatedBill(result.data);
      resetForm();
      await loadTodayBills();
      toast.success(`Ticket #${result.data.ticketNumber} generated`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingConfig && !config) {
    return <p className="text-sm text-muted-foreground">Loading casual swim configuration…</p>;
  }

  return (
    <div className="space-y-6">
      {createdBill && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">Ticket #{createdBill.ticketNumber} Generated</CardTitle>
            <CardDescription>POS receipt — print or download below</CardDescription>
          </CardHeader>
          <CardContent>
            <CasualSwimReceiptActions bill={createdBill} />
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full print:hidden"
              onClick={() => setCreatedBill(null)}
            >
              Create Another Ticket
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Casual Swimming</CardTitle>
              <CardDescription>Walk-in hourly swimming — no customer details required</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="hours">Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  min={1}
                  value={hours}
                  onChange={(e) => setHours(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adults">Adults (Above 5 Years)</Label>
                <Input
                  id="adults"
                  type="number"
                  min={0}
                  value={adultCount}
                  onChange={(e) => setAdultCount(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="children">Children (Below 5 Years)</Label>
                <Input
                  id="children"
                  type="number"
                  min={0}
                  value={childCount}
                  onChange={(e) => setChildCount(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rental Items</CardTitle>
              <CardDescription>Equipment rental quantities</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <QtyStepper label="Swimming Cap" value={capQty} onChange={setCapQty} imageLabel="Cap" />
              <QtyStepper
                label="Swimming Shorts"
                value={shortsQty}
                onChange={setShortsQty}
                imageLabel="Shorts"
              />
              <QtyStepper
                label="Swimming Goggles"
                value={gogglesQty}
                onChange={setGogglesQty}
                imageLabel="Goggles"
              />
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle>Bill Summary</CardTitle>
            <CardDescription>Updates automatically</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="mb-2 font-semibold text-foreground">Swimming Charges</p>
              <div className="space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Adults Charge</span>
                  <span className="tabular-nums">{formatCurrency(breakdown?.adultCharge ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Children Charge</span>
                  <span className="tabular-nums">{formatCurrency(breakdown?.childCharge ?? 0)}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 font-semibold text-foreground">Rental Charges</p>
              <div className="space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Cap Charge</span>
                  <span className="tabular-nums">{formatCurrency(breakdown?.capCharge ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shorts Charge</span>
                  <span className="tabular-nums">{formatCurrency(breakdown?.shortsCharge ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Goggles Charge</span>
                  <span className="tabular-nums">{formatCurrency(breakdown?.gogglesCharge ?? 0)}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-border/60 pt-3">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(breakdown?.totalAmount ?? 0)}</span>
              </div>
              <div className="mt-2 flex justify-between text-base font-bold text-foreground">
                <span>Final Amount</span>
                <span className="tabular-nums text-primary">
                  {formatCurrency(breakdown?.totalAmount ?? 0)}
                </span>
              </div>
            </div>

            {config && (
              <p className="text-xs text-muted-foreground">
                Rates: Adult {formatCurrency(config.adultRatePerHour)}/hr · Child{" "}
                {formatCurrency(config.childRatePerHour)}/hr
              </p>
            )}

            <Button
              type="button"
              className="w-full"
              size="lg"
              disabled={submitting || !breakdown || breakdown.totalAmount <= 0}
              onClick={handleGenerate}
            >
              {submitting ? "Generating…" : "Generate Ticket"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Casual Swim Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {todayBills.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets generated today yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket Number</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Adults</TableHead>
                    <TableHead className="text-right">Children</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-semibold tabular-nums">#{bill.ticketNumber}</TableCell>
                      <TableCell>{formatTicketTime(bill.createdAt)}</TableCell>
                      <TableCell className="text-right tabular-nums">{bill.adultCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{bill.childCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{bill.hours}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatCurrency(bill.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button type="button" size="icon" variant="ghost" title="Print" asChild>
                          <a
                            href={`/casual-swim/receipt/${bill.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Printer className="h-4 w-4" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
