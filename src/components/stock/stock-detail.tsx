"use client";

import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { stockActivityTypeLabel } from "@/lib/stock-activity";
import type { StockActivityType } from "@prisma/client";

export interface StockDetailData {
  id: string;
  stockNumber: string;
  itemName: string;
  category: string;
  quantityPurchased: number;
  totalCost: number;
  supplierName: string;
  purchaseDate: string;
  remarks?: string | null;
  billPdfUrl?: string | null;
  billFileName?: string | null;
  createdAt: string;
  createdBy?: { username: string; name: string; role: string };
  activities?: Array<{
    id: string;
    type: StockActivityType;
    description: string;
    createdAt: string;
    user?: { username: string };
  }>;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/60 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground sm:text-right">{value}</span>
    </div>
  );
}

export function StockDetail({ entry }: { entry: StockDetailData }) {
  const billViewUrl = entry.billPdfUrl ? `/api/stock/${entry.id}/bill?disposition=inline` : null;
  const billDownloadUrl = entry.billPdfUrl
    ? `/api/stock/${entry.id}/bill?disposition=attachment`
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
          <Link href="/stock">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{entry.stockNumber}</h2>
          <p className="text-sm text-muted-foreground">{entry.itemName}</p>
        </div>
      </div>

      <div className="glass-panel p-6">
        <DetailRow label="Item Name" value={entry.itemName} />
        <DetailRow label="Category" value={entry.category} />
        <DetailRow label="Quantity Purchased" value={entry.quantityPurchased.toLocaleString("en-IN")} />
        <DetailRow
          label="Total Purchase Cost"
          value={
            <span className="text-lg font-bold text-primary">{formatCurrency(entry.totalCost)}</span>
          }
        />
        <DetailRow label="Supplier" value={entry.supplierName} />
        <DetailRow label="Purchase Date" value={formatDate(entry.purchaseDate)} />
        <DetailRow label="Remarks" value={entry.remarks?.trim() || "—"} />
        <DetailRow
          label="Created By"
          value={entry.createdBy?.username ?? entry.createdBy?.name ?? "—"}
        />
        <DetailRow label="Created At" value={formatDate(entry.createdAt)} />
      </div>

      {entry.billPdfUrl && (
        <div className="glass-panel space-y-4 p-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Supplier Bill</h3>
          </div>
          {entry.billFileName && (
            <p className="text-sm text-muted-foreground">{entry.billFileName}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <a href={billViewUrl!} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View PDF
              </a>
            </Button>
            <Button className="btn-aqua" asChild>
              <a href={billDownloadUrl!}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </a>
            </Button>
          </div>
        </div>
      )}

      {entry.activities && entry.activities.length > 0 && (
        <div className="glass-panel p-6">
          <h3 className="mb-4 font-semibold">Activity Log</h3>
          <ul className="space-y-2">
            {entry.activities.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "rounded-xl border border-border/60 px-3 py-2 text-sm",
                  "bg-background/40"
                )}
              >
                <span className="font-medium">{stockActivityTypeLabel[a.type]}</span>
                <span className="text-muted-foreground"> — {a.description}</span>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {a.user?.username ?? "System"} · {formatDate(a.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
