"use client";

import { useEffect, useState } from "react";
import { readApiResponse } from "@/lib/api-error";
import { formatCurrency } from "@/lib/utils";
import type { CatalogCategory, CatalogPlan } from "@/lib/subscription-catalog";
import { Label } from "@/components/ui/label";

type SubscriptionPlanPickerProps = {
  onSelect: (plan: CatalogPlan & { categoryName: string }) => void;
};

export function SubscriptionPlanPicker({ onSelect }: SubscriptionPlanPickerProps) {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/catalog/subscriptions");
        const result = await readApiResponse<CatalogCategory[]>(res, "Failed to load packages");
        if (result.ok) {
          const rows = Array.isArray(result.data) ? result.data : [];
          setCategories(rows);
          if (rows[0]) setCategoryId(rows[0].id);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const category = categories.find((row) => row.id === categoryId);
  const plans = category?.plans.filter((plan) => plan.isActive) ?? [];

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-primary/80">
          Package Category
        </Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={loading || categories.length === 0}
        >
          {categories.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-primary/80">
          Select Plan
        </Label>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading plans…</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active plans in this category.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                className="rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
                onClick={() =>
                  onSelect({
                    ...plan,
                    categoryName: category?.name ?? plan.categoryName,
                  })
                }
              >
                <span className="font-medium">{plan.planName}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {formatCurrency(plan.price)}
                  {plan.durationLabel ? ` · ${plan.durationLabel}` : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
