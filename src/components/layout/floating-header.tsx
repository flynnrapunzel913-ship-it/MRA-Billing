"use client";

import { cn } from "@/lib/utils";

const rowOneCellClass = "min-h-[2.75rem] sm:min-h-[3rem]";

/** Row 1 title — centered in parent chrome stack. */
export function FloatingHeaderTitle() {
  return (
    <h1
      className={cn(
        "flex items-center",
        rowOneCellClass,
        "text-center text-xs font-bold uppercase tracking-[0.16em] text-foreground sm:text-sm lg:text-base"
      )}
    >
      Billing System
    </h1>
  );
}
