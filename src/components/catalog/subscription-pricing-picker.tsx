"use client";

import { useEffect, useState } from "react";
import type { PricingSection } from "@prisma/client";
import { readApiResponse } from "@/lib/api-error";
import { formatCurrency } from "@/lib/utils";
import type { PricingRow, PricingSectionGroup } from "@/lib/subscription-pricing";
import { Label } from "@/components/ui/label";

type SubscriptionPricingPickerProps = {
  onSelect: (item: PricingRow & { sectionTitle: string }) => void;
};

export function SubscriptionPricingPicker({ onSelect }: SubscriptionPricingPickerProps) {
  const [sections, setSections] = useState<PricingSectionGroup[]>([]);
  const [section, setSection] = useState<PricingSection>("MONTHLY_PACKAGE");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/catalog/subscriptions");
        const result = await readApiResponse<PricingSectionGroup[]>(
          res,
          "Failed to load packages"
        );
        if (result.ok) {
          const rows = Array.isArray(result.data) ? result.data : [];
          setSections(rows);
          if (rows[0]) setSection(rows[0].section);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const group = sections.find((row) => row.section === section);
  const items = group?.items.filter((item) => item.isActive) ?? [];

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-primary/80">
          Package Section
        </Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={section}
          onChange={(e) => setSection(e.target.value as PricingSection)}
          disabled={loading || sections.length === 0}
        >
          {sections.map((row) => (
            <option key={row.section} value={row.section}>
              {row.title}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-primary/80">
          Select Package
        </Label>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active packages in this section.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
                onClick={() =>
                  onSelect({
                    ...item,
                    sectionTitle: group?.title ?? "",
                  })
                }
              >
                <span className="font-medium">{item.label}</span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatCurrency(item.price)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
