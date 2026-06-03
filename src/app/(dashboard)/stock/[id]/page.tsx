"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { readApiResponse } from "@/lib/api-error";
import { StockDetail, type StockDetailData } from "@/components/stock/stock-detail";

export default function StockDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [entry, setEntry] = useState<StockDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stock/${id}`);
        const result = await readApiResponse<StockDetailData>(res, "Failed to load stock entry");
        if (result.ok) {
          setEntry(result.data);
        } else {
          toast.error(result.message);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <PageSkeleton />;
  if (!entry) {
    return (
      <p className="py-12 text-center text-muted-foreground">Stock entry not found.</p>
    );
  }

  return <StockDetail entry={entry} />;
}
