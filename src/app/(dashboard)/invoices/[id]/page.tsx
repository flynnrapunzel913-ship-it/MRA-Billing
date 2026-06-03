"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatCurrency } from "@/lib/utils";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { useInvoiceDelete } from "@/lib/hooks/use-invoice-delete";
import { canDeleteInvoice } from "@/lib/invoice-permissions";
import { DetailPageSkeleton } from "@/components/ui/skeletons";
import { DeleteInvoiceDialog } from "@/components/invoices/delete-invoice-dialog";
import {
  InvoiceDetailView,
  type InvoiceDetail,
} from "@/components/invoices/invoice-detail-view";

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: session } = useSession();
  const { data: invoice, isInitialLoading } = useCachedFetch<InvoiceDetail>(
    id ? `/api/invoices/${id}` : "",
    { enabled: !!id }
  );

  const { deleteTarget, setDeleteTarget, deleting, handleDelete } = useInvoiceDelete({
    redirectAfterDelete: "/invoices",
  });

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

  const allowDelete = canDeleteInvoice(session?.user?.role, session?.user?.id, invoice);

  return (
    <>
      <InvoiceDetailView
        invoice={invoice}
        onWhatsApp={shareWhatsApp}
        showDelete={allowDelete}
        onDelete={() =>
          setDeleteTarget({
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.customerName,
            invoiceDate: invoice.invoiceDate,
            grandTotal: invoice.grandTotal,
            paymentStatus: invoice.paymentStatus,
            createdById: invoice.createdById,
          })
        }
      />
      <DeleteInvoiceDialog
        open={!!deleteTarget}
        invoiceNumber={deleteTarget?.invoiceNumber ?? invoice.invoiceNumber}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
