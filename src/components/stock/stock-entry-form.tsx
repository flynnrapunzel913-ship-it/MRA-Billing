"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Upload, FileText, Loader2 } from "lucide-react";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { stockEntrySchema, type StockEntryInput } from "@/lib/validations";
import { STOCK_CATEGORIES } from "@/lib/constants";
import { readApiResponse, messageFromApiBody } from "@/lib/api-error";
import { formatDateInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuantityInput } from "@/components/ui/quantity-input";
import { useEditableInteger } from "@/lib/hooks/use-editable-integer";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { invalidateCachePrefix } from "@/lib/client-cache";

const glassCard = "glass-panel p-6 space-y-6";

export function StockEntryForm() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [billPdfUrl, setBillPdfUrl] = useState<string | null>(null);
  const [billFileName, setBillFileName] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StockEntryInput>({
    resolver: zodResolver(stockEntrySchema),
    defaultValues: {
      itemName: "",
      category: STOCK_CATEGORIES[0],
      quantityPurchased: 1,
      totalCost: 0,
      supplierName: "",
      purchaseDate: formatDateInput(new Date()),
      remarks: "",
    },
  });

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const result = await readApiResponse<{ billPdfUrl: string; billFileName: string }>(
        res,
        "Upload failed"
      );
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setBillPdfUrl(result.data.billPdfUrl);
      setBillFileName(result.data.billFileName);
      toast.success("Bill PDF uploaded");
    } finally {
      setUploading(false);
    }
  };

  const quantityPurchased = watch("quantityPurchased");
  const quantityField = useEditableInteger({
    value: quantityPurchased,
    onCommit: (next) =>
      setValue("quantityPurchased", next, { shouldDirty: true, shouldValidate: true }),
    min: 1,
  });

  const onSubmit = async (data: StockEntryInput) => {
    setSaving(true);
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          billPdfUrl: billPdfUrl ?? undefined,
          billFileName: billFileName ?? undefined,
        }),
      });

      const text = await res.text();
      let parsed: unknown = null;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          toast.error("Invalid server response");
          return;
        }
      }

      if (!res.ok) {
        toast.error(messageFromApiBody(parsed, "Failed to save stock entry"));
        return;
      }

      const created = parsed as { id: string; stockNumber: string };
      toast.success(`Stock entry ${created.stockNumber} saved`);
      invalidateCachePrefix("/api/stock");
      router.push(`/stock/${created.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-6">
      <div className={glassCard}>
        <div>
          <h2 className="text-lg font-semibold">New Stock Purchase</h2>
          <p className="text-sm text-muted-foreground">
            Record incoming inventory from a supplier
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="itemName">Item Name</Label>
            <Input id="itemName" {...register("itemName")} placeholder="e.g. Swimming Costume" />
            {errors.itemName && (
              <p className="text-sm text-destructive">{errors.itemName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              {...register("category")}
              className="flex h-10 w-full rounded-xl border border-input bg-background/80 px-3 text-sm"
            >
              {STOCK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplierName">Supplier Name</Label>
            <Input id="supplierName" {...register("supplierName")} placeholder="ABC Sports Suppliers" />
            {errors.supplierName && (
              <p className="text-sm text-destructive">{errors.supplierName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantityPurchased">Quantity Purchased</Label>
            <QuantityInput
              id="quantityPurchased"
              displayValue={quantityField.displayValue}
              onValueChange={quantityField.handleChange}
              onBlur={quantityField.handleBlur}
            />
            {errors.quantityPurchased && (
              <p className="text-sm text-destructive">{errors.quantityPurchased.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalCost">Total Purchase Cost (₹)</Label>
            <Input
              id="totalCost"
              type="number"
              min={0}
              step="0.01"
              {...register("totalCost", { valueAsNumber: true })}
            />
            {errors.totalCost && (
              <p className="text-sm text-destructive">{errors.totalCost.message}</p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
            {errors.purchaseDate && (
              <p className="text-sm text-destructive">{errors.purchaseDate.message}</p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="remarks">Remarks (optional)</Label>
            <Input id="remarks" {...register("remarks")} placeholder="Notes about this purchase" />
          </div>
        </div>
      </div>

      <div className={glassCard}>
        <Label>Upload Bill PDF</Label>
        <p className="text-xs text-muted-foreground">PDF only, max 10 MB</p>
        <div className="flex flex-wrap items-center gap-3">
          <label
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-primary/40 px-4 py-3 text-sm",
              "hover:bg-primary/5 transition-colors",
              uploading && "pointer-events-none opacity-60"
            )}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 text-primary" />
            )}
            {uploading ? "Uploading…" : "Choose PDF"}
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload(file);
                e.target.value = "";
              }}
            />
          </label>
          {billFileName && (
            <span className="inline-flex items-center gap-2 text-sm text-foreground">
              <FileText className="h-4 w-4 text-primary" />
              {billFileName}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="btn-aqua-cta" disabled={saving}>
          {saving ? "Saving…" : "Save Stock Entry"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <PrefetchLink href="/stock">Cancel</PrefetchLink>
        </Button>
      </div>
    </form>
  );
}
