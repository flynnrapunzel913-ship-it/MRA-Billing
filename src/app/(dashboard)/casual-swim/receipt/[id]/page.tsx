"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import type { CasualSwimBillDto } from "@/lib/casual-swim-bill";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { CasualSwimReceiptActions } from "@/components/casual-swim/casual-swim-receipt-actions";

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
      <div className="print:hidden">
        <PageSkeleton className="mx-auto max-w-md" />
      </div>
    );
  }

  return (
    <div className="mx-auto space-y-4 py-4 print:py-0" style={{ maxWidth: "58mm" }}>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #casual-swim-receipt,
          #casual-swim-receipt * {
            visibility: visible;
          }
          #casual-swim-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 58mm;
          }
        }
      `}</style>
      <CasualSwimReceiptActions bill={bill} />
    </div>
  );
}
