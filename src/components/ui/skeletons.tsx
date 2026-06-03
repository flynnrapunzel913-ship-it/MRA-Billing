import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted/50", className)} />;
}

export function SkeletonBar({ className }: { className?: string }) {
  return <Bone className={cn("h-4 w-full", className)} />;
}

export function TableSkeleton({
  rows = 6,
  cols = 5,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={cn("animate-pulse space-y-2", className)}>
      <div className="flex gap-3 border-b border-border/60 pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Bone key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 py-2">
          {Array.from({ length: cols }).map((_, c) => (
            <Bone key={c} className="h-10 flex-1 rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function KpiCardsSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-4 animate-pulse",
        count === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-panel flex items-center gap-4 p-5 sm:p-6">
          <Bone className="h-12 w-12 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Bone className="h-3 w-24" />
            <Bone className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton({ kpiCount = 3 }: { kpiCount?: number }) {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-5">
      <div className="flex justify-end gap-2">
        <Bone className="h-11 w-36 rounded-[14px]" />
        <Bone className="h-11 w-40 rounded-[14px]" />
      </div>
      <KpiCardsSkeleton count={kpiCount} />
      <div className="glass-panel overflow-hidden p-5">
        <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-4">
          <Bone className="h-5 w-5 rounded" />
          <Bone className="h-5 w-36" />
        </div>
        <TableSkeleton rows={5} cols={5} />
      </div>
    </div>
  );
}

export function StockPageSkeleton({ kpiCount = 2, showFinancial = false }: { kpiCount?: number; showFinancial?: boolean }) {
  const count = showFinancial ? 4 : kpiCount;
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Bone className="h-8 w-48" />
          <Bone className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-10 w-40 rounded-[14px]" />
          <Bone className="h-10 w-44 rounded-[14px]" />
        </div>
      </div>
      <KpiCardsSkeleton count={count} />
      <div className="glass-panel p-4 sm:p-6">
        <TableSkeleton rows={6} cols={6} />
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Bone className="h-9 w-9 rounded-xl" />
        <div className="space-y-2">
          <Bone className="h-7 w-40" />
          <Bone className="h-4 w-56" />
        </div>
      </div>
      <div className="glass-panel space-y-4 p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex justify-between gap-4 border-b border-border/40 py-3 last:border-0">
            <Bone className="h-4 w-28" />
            <Bone className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListPageSkeleton() {
  return (
    <div className="mx-auto w-full animate-pulse space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Bone className="h-11 w-full max-w-md rounded-xl" />
        <Bone className="h-11 w-36 rounded-[14px]" />
      </div>
      <div className="flex justify-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Bone key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="glass-panel rounded-[20px] p-4">
        <TableSkeleton rows={8} cols={4} />
      </div>
    </div>
  );
}

export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={className}>
      <ListPageSkeleton />
    </div>
  );
}

export function DrawerSkeleton() {
  return (
    <div className="animate-pulse space-y-6 px-1 py-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Bone className="h-3 w-24" />
          <Bone className="h-5 w-full max-w-xs" />
        </div>
      ))}
      <Bone className="h-24 w-full rounded-xl" />
    </div>
  );
}

export function FormPageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Bone className="h-9 w-9 rounded-xl" />
        <Bone className="h-7 w-48" />
      </div>
      <div className="glass-panel space-y-5 p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Bone className="h-3 w-28" />
            <Bone className="h-11 w-full rounded-xl" />
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <Bone className="h-11 w-24 rounded-[14px]" />
          <Bone className="h-11 w-32 rounded-[14px]" />
        </div>
      </div>
    </div>
  );
}
