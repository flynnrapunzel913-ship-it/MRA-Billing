"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type QuantityInputProps = {
  displayValue: string;
  onValueChange: (raw: string) => void;
  onBlur: () => void;
  className?: string;
  id?: string;
  "aria-label"?: string;
};

export function QuantityInput({
  displayValue,
  onValueChange,
  onBlur,
  className,
  id,
  "aria-label": ariaLabel,
}: QuantityInputProps) {
  return (
    <Input
      id={id}
      aria-label={ariaLabel}
      className={cn("h-9 text-sm", className)}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={displayValue}
      onChange={(e) => onValueChange(e.target.value)}
      onBlur={onBlur}
    />
  );
}
