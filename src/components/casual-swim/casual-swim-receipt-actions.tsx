"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CasualSwimBillDto } from "@/lib/casual-swim-bill";
import { formatReceiptTimestamp } from "@/lib/casual-swim-receipt-format";
import { CasualSwimReceiptView } from "./casual-swim-receipt-view";

export function CasualSwimReceiptActions({ bill }: { bill: CasualSwimBillDto }) {
  const [printedAt, setPrintedAt] = useState<{ date: string; time: string } | null>(null);

  const handlePrint = () => {
    setPrintedAt(formatReceiptTimestamp(new Date()));
    window.setTimeout(() => window.print(), 100);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/60 bg-white p-2 print:border-0 print:p-0">
        <CasualSwimReceiptView bill={bill} printedAt={printedAt} />
      </div>
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button type="button" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print Receipt
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href={`/api/casual-swim/bills/${bill.id}/pdf`} target="_blank" rel="noreferrer">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </a>
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href={`/casual-swim/receipt/${bill.id}`} target="_blank" rel="noreferrer">
            <Printer className="mr-2 h-4 w-4" />
            Reprint Receipt
          </a>
        </Button>
      </div>
    </div>
  );
}
