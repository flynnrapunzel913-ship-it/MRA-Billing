"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { readApiResponse } from "@/lib/api-error";
import {
  InvoiceDetailView,
  type InvoiceDetail,
} from "@/components/invoices/invoice-detail-view";

export default function InvoiceDetailPage() {
  const params = useParams();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);

  const loadInvoice = async () => {
    const res = await fetch(`/api/invoices/${params.id}`);
    const result = await readApiResponse<InvoiceDetail>(res, "Failed to load invoice");
    if (result.ok) {
      setInvoice(result.data);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [params.id]);

  if (!invoice) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Loading invoice…
      </div>
    );
  }

  const duplicateInvoice = async () => {
    const res = await fetch(`/api/invoices/${invoice.id}/duplicate`, { method: "POST" });
    const result = await readApiResponse<{ id: string }>(res, "Failed to duplicate");
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Invoice duplicated");
    window.location.href = `/invoices/${result.data.id}`;
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `MR Academy Invoice ${invoice.invoiceNumber}\nCustomer: ${invoice.customerName}\nAmount: ${formatCurrency(Number(invoice.grandTotal))}\nPDF: ${window.location.origin}/api/invoices/${invoice.id}/pdf`
    );
    const phone = invoice.customerMobile?.replace(/\D/g, "").slice(-10);
    if (phone) {
      window.open(`https://wa.me/91${phone}?text=${text}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${text}`, "_blank");
    }
  };

  const emailInvoice = () => {
    const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber} - MR Academy`);
    const body = encodeURIComponent(
      `Dear ${invoice.customerName},\n\nPlease find your invoice ${invoice.invoiceNumber} for ${formatCurrency(Number(invoice.grandTotal))}.\n\nDownload PDF: ${window.location.origin}/api/invoices/${invoice.id}/pdf`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <InvoiceDetailView
      invoice={invoice}
      onDuplicate={duplicateInvoice}
      onWhatsApp={shareWhatsApp}
      onEmail={emailInvoice}
    />
  );
}
