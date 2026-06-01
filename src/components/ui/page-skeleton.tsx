import { cn } from "@/lib/utils";

export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto max-w-5xl animate-pulse space-y-4", className)}>
      <div className="flex justify-end">
        <div className="h-11 w-36 rounded-[14px] bg-muted/60" />
      </div>
      <div className="glass-panel h-24 rounded-[24px] bg-muted/40" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-row h-20 rounded-2xl bg-muted/35" />
        ))}
      </div>
    </div>
  );
}
