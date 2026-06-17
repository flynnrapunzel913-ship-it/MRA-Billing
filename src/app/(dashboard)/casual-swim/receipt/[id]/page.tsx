"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import type { CasualSwimBillDto } from "@/lib/casual-swim-bill";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { CasualSwimReceiptActions } from "@/components/casual-swim/casual-swim-receipt-actions";
import { CASUAL_SWIM_RECEIPT_WIDTH_MM } from "@/lib/casual-swim-receipt-pdf-size";

export default function CasualSwimReceiptPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: bill, isInitialLoading } = useCachedFetch<CasualSwimBillDto>(
    `/api/casual-swim/bills/${id}`,
    { enabled: Boolean(id) }
  );

  useEffect(() => {
    document.title = bill ? `Ticket #${bill.ticketNumber}` : "Receipt";
  }, [bill]);

  if (isInitialLoading || !bill) {
    return (
      <div className="casual-swim-receipt-print-hidden">
        <PageSkeleton className="mx-auto max-w-md" />
      </div>
    );
  }

  return (
    <div
      className="mx-auto space-y-4 py-4 print:py-0"
      style={{ maxWidth: `${CASUAL_SWIM_RECEIPT_WIDTH_MM}mm` }}
    >
      <CasualSwimReceiptActions bill={bill} />
    </div>
  );
}
