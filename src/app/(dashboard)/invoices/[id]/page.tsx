"use client";

import { useParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { DetailPageSkeleton } from "@/components/ui/skeletons";
import {
  InvoiceDetailView,
  type InvoiceDetail,
} from "@/components/invoices/invoice-detail-view";

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: invoice, isInitialLoading } = useCachedFetch<InvoiceDetail>(
    id ? `/api/invoices/${id}` : "",
    { enabled: !!id }
  );

  if (isInitialLoading && !invoice) {
    return <DetailPageSkeleton />;
  }

  if (!invoice) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Invoice not found
      </div>
    );
  }

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

  return (
    <InvoiceDetailView
      invoice={invoice}
      onWhatsApp={shareWhatsApp}
    />
  );
}
