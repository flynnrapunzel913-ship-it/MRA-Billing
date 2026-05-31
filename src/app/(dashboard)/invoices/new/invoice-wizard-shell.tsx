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
        "relative -m-4 min-h-full overflow-visible p-4 lg:-m-6 lg:p-6",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/4 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-[#0EA5E9]/12 blur-[100px] dark:bg-[#0070C0]/25" />
        <div className="absolute right-0 top-1/3 h-56 w-56 rounded-full bg-[#38bdf8]/10 blur-[80px] dark:bg-[#38bdf8]/20" />
        <div className="absolute bottom-0 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-[#0284C7]/8 blur-[90px] dark:bg-[#0070C0]/10" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
