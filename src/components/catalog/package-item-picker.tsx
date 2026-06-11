"use client";

import { useEffect, useState } from "react";
import { readApiResponse } from "@/lib/api-error";
import { formatCurrency } from "@/lib/utils";
import type { CatalogPackageGroup, CatalogPackageItem } from "@/lib/package-catalog";
import { Label } from "@/components/ui/label";

type PackageItemPickerProps = {
  onSelect: (item: CatalogPackageItem & { groupName: string }) => void;
};

export function PackageItemPicker({ onSelect }: PackageItemPickerProps) {
  const [groups, setGroups] = useState<CatalogPackageGroup[]>([]);
  const [groupId, setGroupId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/catalog/subscriptions");
        const result = await readApiResponse<CatalogPackageGroup[]>(res, "Failed to load packages");
        if (result.ok) {
          const rows = Array.isArray(result.data) ? result.data : [];
          setGroups(rows);
          if (rows[0]) setGroupId(rows[0].id);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const group = groups.find((row) => row.id === groupId);
  const items = group?.items.filter((item) => item.isActive) ?? [];

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-primary/80">
          Package Group
        </Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          disabled={loading || groups.length === 0}
        >
          {groups.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-primary/80">
          Select Item
        </Label>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active items in this group.</p>
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
                    groupName: group?.name ?? item.groupName,
                  })
                }
              >
                <span className="font-medium leading-snug">{item.title}</span>
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
