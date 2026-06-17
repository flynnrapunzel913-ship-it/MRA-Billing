"use client";

import { CASUAL_SWIM_RECEIPT_WIDTH_MM } from "@/lib/casual-swim-receipt-pdf-size";

/** Chrome / thermal printer styles — one 80mm strip, no A4 blank pages. */
export function CasualSwimThermalPrintStyles() {
  const width = `${CASUAL_SWIM_RECEIPT_WIDTH_MM}mm`;

  return (
    <style jsx global>{`
      @media print {
        @page {
          size: ${width} auto;
          margin: 0;
        }

        html,
        body {
          width: ${width} !important;
          height: auto !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          background: white !important;
        }

        body * {
          min-height: 0 !important;
        }

        .min-h-screen,
        .h-screen {
          min-height: 0 !important;
          height: auto !important;
        }

        body * {
          visibility: hidden;
        }

        #casual-swim-receipt,
        #casual-swim-receipt * {
          visibility: visible;
        }

        #casual-swim-receipt {
          position: fixed;
          left: 0;
          top: 0;
          width: ${width};
          margin: 0;
          padding: 0;
        }

        .casual-swim-receipt-print-hidden {
          display: none !important;
        }
      }
    `}</style>
  );
}
