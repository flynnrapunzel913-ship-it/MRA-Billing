"use client";

import { formatCurrency } from "@/lib/utils";
import type { CasualSwimBillDto } from "@/lib/casual-swim-bill";
import { getCasualSwimReceiptPaymentLines } from "@/lib/casual-swim-payment";

export function CasualSwimReceiptPaymentSection({ bill }: { bill: CasualSwimBillDto }) {
  const { mode, lines } = getCasualSwimReceiptPaymentLines(bill);

  return (
    <>
      <ReceiptRow label="Payment Mode" value={mode} />
      {lines.map((line) => (
        <ReceiptRow key={line.label} label={line.label} value={formatCurrency(line.amount)} />
      ))}
    </>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-[9px]">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
