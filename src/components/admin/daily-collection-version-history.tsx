"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { readApiResponse } from "@/lib/api-error";
import {
  COLLECTION_FIELD_LABELS,
  type DailyCollectionVersionHistoryResponse,
  type CollectionVersionEntry,
} from "@/lib/daily-collection-history";
import type { CollectionDiffValues } from "@/lib/daily-collection-diff";

function formatVersionDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function formatChangeValue(
  key: keyof CollectionDiffValues,
  value: string | number | null
): string {
  if (value == null || value === "") return "—";
  if (
    key === "notes" ||
    key === "collectedByName" ||
    key === "cashDifferenceNotes"
  ) {
    return String(value);
  }
  if (typeof value === "number") return formatCurrency(value);
  return String(value);
}

function OriginalVersionBody({
  snapshot,
}: {
  snapshot: Extract<CollectionVersionEntry, { type: "original" }>["snapshot"];
}) {
  const rows: { label: string; value: string }[] = [];
  if (snapshot.totalRevenue != null) {
    rows.push({ label: "Revenue", value: formatCurrency(snapshot.totalRevenue) });
  }
  if (snapshot.totalExpenses != null) {
    rows.push({ label: "Expenses", value: formatCurrency(snapshot.totalExpenses) });
  }
  if (snapshot.cashCollected != null) {
    rows.push({ label: "Cash", value: formatCurrency(snapshot.cashCollected) });
  }
  if (snapshot.upiCollected != null) {
    rows.push({ label: "UPI", value: formatCurrency(snapshot.upiCollected) });
  }
  if (snapshot.netCollection != null) {
    rows.push({ label: "Net Collection", value: formatCurrency(snapshot.netCollection) });
  }

  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      {rows.map((row) => (
        <p key={row.label}>
          <span className="text-foreground/80">{row.label}:</span> {row.value}
        </p>
      ))}
    </div>
  );
}

function EditVersionBody({
  entry,
}: {
  entry: Extract<CollectionVersionEntry, { type: "edit" }>;
}) {
  const changeKeys = Object.keys(entry.changes) as (keyof CollectionDiffValues)[];

  if (changeKeys.length === 0) {
    return <p className="text-sm text-muted-foreground">No field changes recorded.</p>;
  }

  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium text-foreground/90">Changed:</p>
      {changeKeys.map((key) => {
        const change = entry.changes[key];
        if (!change) return null;
        return (
          <div key={key} className="text-muted-foreground">
            <p className="font-medium text-foreground/85">{COLLECTION_FIELD_LABELS[key]}</p>
            <p className="tabular-nums">
              {formatChangeValue(key, change.old)} → {formatChangeValue(key, change.new)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

interface DailyCollectionVersionHistoryProps {
  date: string;
  lastEditedAt: string;
  refreshKey?: number;
}

export function DailyCollectionVersionHistory({
  date,
  lastEditedAt,
  refreshKey = 0,
}: DailyCollectionVersionHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<DailyCollectionVersionHistoryResponse | null>(null);

  const loadHistory = async (force = false) => {
    if (loading) return;
    if (history && !force) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/daily-collection/history?date=${date}`);
      const result = await readApiResponse<DailyCollectionVersionHistoryResponse>(
        res,
        "Failed to load version history"
      );
      if (result.ok) {
        setHistory(result.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      await loadHistory();
    }
  };

  useEffect(() => {
    if (!expanded || refreshKey === 0) return;
    void loadHistory(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when refreshKey changes while open
  }, [refreshKey]);

  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={toggle}
        className="text-left text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Last Edited: {formatVersionDateTime(lastEditedAt)}
      </button>

      {expanded && (
        <div className="mt-3 rounded-lg border border-border/60 bg-card/40 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            Version History
          </p>

          {loading && !history && (
            <p className="text-sm text-muted-foreground">Loading history…</p>
          )}

          {history && (
            <div className="space-y-4">
              {history.versions.map((entry, index) => (
                <div
                  key={`${entry.version}-${entry.createdAt}`}
                  className={cn(index > 0 && "border-t border-border/50 pt-4")}
                >
                  <div className="mb-2 flex items-start gap-2">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">
                        {entry.type === "original"
                          ? "Version 0 (Original)"
                          : `Version ${entry.version}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.type === "original" ? "Created" : "Edited"}:{" "}
                        {formatVersionDateTime(entry.createdAt)}
                        {entry.type === "edit" && (
                          <>
                            {" "}
                            · {entry.editedBy.name || entry.editedBy.username}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="ml-6">
                    {entry.type === "original" ? (
                      <OriginalVersionBody snapshot={entry.snapshot} />
                    ) : (
                      <EditVersionBody entry={entry} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
