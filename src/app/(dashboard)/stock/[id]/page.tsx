"use client";

import { useParams } from "next/navigation";
import { DetailPageSkeleton } from "@/components/ui/skeletons";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { StockDetail, type StockDetailData } from "@/components/stock/stock-detail";

export default function StockDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: entry, isInitialLoading, error } = useCachedFetch<StockDetailData>(
    id ? `/api/stock/${id}` : "",
    { enabled: !!id }
  );

  if (isInitialLoading && !entry) return <DetailPageSkeleton />;
  if (error && !entry) {
    return (
      <p className="py-12 text-center text-muted-foreground">{error}</p>
    );
  }
  if (!entry) {
    return (
      <p className="py-12 text-center text-muted-foreground">Stock entry not found.</p>
    );
  }

  return <StockDetail entry={entry} />;
}
