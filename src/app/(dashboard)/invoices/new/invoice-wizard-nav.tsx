"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InvoiceWizardNavProps {
  step: number;
  loading?: boolean;
  onBack: () => void;
  onNext: () => void | Promise<void>;
  onSubmit: () => void;
  className?: string;
}

/** Inline navigation directly below the active step card */
export function InvoiceWizardNav({
  step,
  loading,
  onBack,
  onNext,
  onSubmit,
  className,
}: InvoiceWizardNavProps) {
  const isFirst = step === 0;
  const isLast = step === 3;

  return (
    <div
      className={cn(
        "glass-panel mt-3 flex items-center justify-between gap-3 rounded-xl px-3 py-2.5",
        className
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 min-w-[5.5rem] rounded-lg border-border/80 text-sm font-medium"
        onClick={onBack}
        disabled={isFirst || loading}
      >
        Back
      </Button>

      {isLast ? (
        <Button
          type="button"
          variant="aqua"
          size="sm"
          className="h-9 rounded-lg px-4 text-sm font-semibold"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              Generate Invoice
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </>
          )}
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          className="h-9 rounded-lg px-4 text-sm font-medium"
          onClick={onNext}
          disabled={loading}
        >
          Next Step
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
