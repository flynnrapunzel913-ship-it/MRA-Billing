"use client";

import { useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { readApiResponse } from "@/lib/api-error";
import type { CasualSwimBillDto } from "@/lib/casual-swim-bill";
import { CasualSwimThermalPrintStyles } from "./casual-swim-thermal-print-styles";
import { CasualSwimReceiptView } from "./casual-swim-receipt-view";

export function CasualSwimReceiptActions({ bill }: { bill: CasualSwimBillDto }) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handlePrint = () => {
    window.setTimeout(() => window.print(), 50);
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/casual-swim/bills/${bill.id}/pdf`);
      if (!res.ok) {
        const result = await readApiResponse(res, "Failed to generate receipt PDF");
        toast.error(result.ok ? "Failed to download PDF" : result.message);
        return;
      }

      const blob = await res.blob();
      if (blob.type && !blob.type.includes("pdf")) {
        toast.error("Server did not return a PDF receipt");
        return;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ticket-${String(bill.ticketNumber).padStart(3, "0")}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download receipt PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="casual-swim-receipt-actions space-y-4">
      <CasualSwimThermalPrintStyles />
      <div className="rounded-lg border border-border/60 bg-white p-2 print:border-0 print:p-0">
        <CasualSwimReceiptView bill={bill} />
      </div>
      <div className="casual-swim-receipt-print-hidden flex flex-wrap gap-2 print:hidden">
        <Button type="button" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print Receipt
        </Button>
        <Button type="button" variant="outline" disabled={downloadingPdf} onClick={handleDownloadPdf}>
          {downloadingPdf ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Download PDF
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
