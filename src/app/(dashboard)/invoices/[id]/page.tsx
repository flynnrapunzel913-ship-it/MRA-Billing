"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Mail,
  MessageCircle,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { paymentStatusLabel, paymentMethodLabel, isCoachingPackage } from "@/lib/constants";

export default function InvoiceDetailPage() {
  const params = useParams();
  const [invoice, setInvoice] = useState<any>(null);

  const loadInvoice = async () => {
    const res = await fetch(`/api/invoices/${params.id}`);
    setInvoice(await res.json());
  };

  useEffect(() => {
    loadInvoice();
  }, [params.id]);

  if (!invoice) {
    return <div className="py-20 text-center text-muted-foreground">Loading...</div>;
  }

  const duplicateInvoice = async () => {
    const res = await fetch(`/api/invoices/${invoice.id}/duplicate`, { method: "POST" });
    if (!res.ok) {
      toast.error("Failed to duplicate");
      return;
    }
    const dup = await res.json();
    toast.success("Invoice duplicated");
    window.location.href = `/invoices/${dup.id}`;
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/invoices"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{invoice.invoiceNumber}</h2>
            <p className="text-sm text-muted-foreground">{invoice.customerName}</p>
          </div>
          <Badge variant={invoice.paymentStatus === "FULLY_PAID" ? "success" : "warning"}>
            {paymentStatusLabel(invoice.paymentStatus)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank">
              <Printer className="mr-2 h-4 w-4" />Print PDF
            </a>
          </Button>
          <Button variant="outline" onClick={duplicateInvoice}>
            <Copy className="mr-2 h-4 w-4" />Duplicate
          </Button>
          <Button variant="outline" onClick={shareWhatsApp}>
            <MessageCircle className="mr-2 h-4 w-4" />WhatsApp
          </Button>
          <Button variant="outline" onClick={emailInvoice}>
            <Mail className="mr-2 h-4 w-4" />Email
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Invoice Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <p><span className="text-muted-foreground">Date:</span> {formatDate(invoice.invoiceDate)}</p>
            <p><span className="text-muted-foreground">Phone:</span> {invoice.customerMobile || "-"}</p>
            <p><span className="text-muted-foreground">Mode of Payment:</span> {paymentMethodLabel(invoice.paymentMethod)}</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sl</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Package Period</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.slNo}</TableCell>
                  <TableCell>{item.itemType}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(Number(item.unitPrice))}</TableCell>
                  <TableCell>{formatCurrency(Number(item.amount))}</TableCell>
                  <TableCell className="text-xs">
                    {isCoachingPackage(item.itemType) && (item.packageStartDate || item.packageEndDate) ? (
                      <>
                        {item.packageStartDate ? formatDate(item.packageStartDate) : "—"}
                        {" → "}
                        {item.packageEndDate ? formatDate(item.packageEndDate) : "—"}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(Number(invoice.subtotal))}</span></div>
            {invoice.gstEnabled && Number(invoice.totalGst) > 0 && (
              <>
                <div className="flex justify-between"><span>CGST ({Number(invoice.cgstRate)}%)</span><span>{formatCurrency(Number(invoice.cgstAmount))}</span></div>
                <div className="flex justify-between"><span>SGST ({Number(invoice.sgstRate)}%)</span><span>{formatCurrency(Number(invoice.sgstAmount))}</span></div>
              </>
            )}
            <div className="flex justify-between font-bold text-primary"><span>Grand Total</span><span>{formatCurrency(Number(invoice.grandTotal))}</span></div>
            <div className="flex justify-between border-t pt-2"><span>Payment Status</span><span>{paymentStatusLabel(invoice.paymentStatus)}</span></div>
            <div className="flex justify-between"><span>Amount Paid</span><span>{formatCurrency(Number(invoice.amountPaid))}</span></div>
            <div className="flex justify-between"><span>Amount Remaining</span><span>{formatCurrency(Number(invoice.amountRemaining))}</span></div>
            <p className="pt-2 text-xs text-muted-foreground">{invoice.amountInWords}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
