"use client";

import { Trash2 } from "lucide-react";
import { ITEM_TYPES, isCoachingPackage } from "@/lib/constants";
import { lineTotal } from "@/lib/invoice-utils";
import { useInvoiceStore } from "@/stores/invoice-store";
import type { InvoiceLineItem } from "@/lib/invoice-utils";
import {
  packageEndDateForLineItem,
  resolveLineItemDuration,
} from "@/lib/subscription-duration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuantityInput } from "@/components/ui/quantity-input";
import { useEditableInteger } from "@/lib/hooks/use-editable-integer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, cn } from "@/lib/utils";

interface InvoiceItemRowProps {
  index: number;
  item: InvoiceLineItem;
  canRemove: boolean;
}

export function InvoiceItemRow({ index, item, canRemove }: InvoiceItemRowProps) {
  const update = (next: InvoiceLineItem) =>
    useInvoiceStore.getState().updateItem(index, next);

  const quantity = useEditableInteger({
    value: item.quantity,
    onCommit: (nextQuantity) => update({ ...item, quantity: nextQuantity }),
    min: 1,
  });

  const lineItemForTotal = { ...item, quantity: quantity.effectiveValue };
  const hasAutoEndDate = isCoachingPackage(item.itemType) && resolveLineItemDuration(item) != null;
  const displayedEndDate = packageEndDateForLineItem(item);

  return (
    <div className="grid grid-cols-12 items-end gap-2 rounded-lg border border-border bg-card/90 px-2 py-2 shadow-sm">
      <div className="col-span-12 sm:col-span-3">
        <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-primary/80">
          Category
        </span>
        <Select value={item.itemType} onValueChange={(v) => update({ ...item, itemType: v })}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ITEM_TYPES.map((type) => (
              <SelectItem key={type} value={type} className="text-xs">
                {type === "Coaching Package" ? "Coaching" : "Product"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-12 sm:col-span-4">
        <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-primary/80">
          Description
        </span>
        <Input
          className="h-9 text-sm"
          placeholder="Description"
          value={item.description}
          onChange={(e) => update({ ...item, description: e.target.value })}
        />
      </div>
      {isCoachingPackage(item.itemType) && (
        <>
          <div className="col-span-6 sm:col-span-2">
            <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-primary/80">
              Start
            </span>
            <Input
              className="h-9 text-sm"
              type="date"
              value={item.packageStartDate ?? ""}
              onChange={(e) => update({ ...item, packageStartDate: e.target.value })}
            />
          </div>
          <div className="col-span-6 sm:col-span-2">
            <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-primary/80">
              End
            </span>
            <Input
              className="h-9 text-sm"
              type="date"
              value={displayedEndDate}
              readOnly={hasAutoEndDate}
              disabled={hasAutoEndDate}
              onChange={(e) => update({ ...item, packageEndDate: e.target.value })}
            />
          </div>
        </>
      )}
      <div className={cn("col-span-4", isCoachingPackage(item.itemType) ? "sm:col-span-1" : "sm:col-span-1")}>
        <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-primary/80">
          Qty
        </span>
        <QuantityInput
          displayValue={quantity.displayValue}
          onValueChange={quantity.handleChange}
          onBlur={quantity.handleBlur}
        />
      </div>
      <div className="col-span-4 sm:col-span-2">
        <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-primary/80">
          Price
        </span>
        <Input
          className="h-9 text-sm"
          type="number"
          min={0}
          placeholder="0"
          value={item.unitPrice || ""}
          onChange={(e) => update({ ...item, unitPrice: Number(e.target.value) || 0 })}
        />
      </div>
      <div className="col-span-3 flex items-center justify-between gap-1 sm:col-span-2">
        <div>
          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-primary/80">
            Total
          </span>
          <p className="text-sm font-bold text-primary">
            {formatCurrency(lineTotal(lineItemForTotal))}
          </p>
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => useInvoiceStore.getState().removeItem(index)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}
