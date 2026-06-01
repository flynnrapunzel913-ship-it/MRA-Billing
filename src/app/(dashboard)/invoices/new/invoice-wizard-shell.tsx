"use client";

import { cn } from "@/lib/utils";

export function InvoiceWizardShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative -mx-4 mt-6 min-h-[calc(100dvh-10rem)] overflow-visible p-3 sm:mt-8 sm:p-4",
        "lg:-mx-6 lg:mt-10 lg:min-h-[calc(100dvh-12rem)] lg:p-6",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-2xl border border-border/60",
          "bg-[#e8f7fc]/96 shadow-[var(--shadow-card)] backdrop-blur-md",
          "dark:border-primary/15 dark:bg-[#041018]/96"
        )}
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
        <div className="absolute left-1/4 top-16 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/12 blur-[90px]" />
        <div className="absolute right-8 top-1/4 h-44 w-44 rounded-full bg-primary/8 blur-[70px]" />
        <div className="absolute bottom-8 left-1/2 h-40 w-80 -translate-x-1/2 rounded-full bg-primary/6 blur-[80px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl">{children}</div>
    </div>
  );
}
