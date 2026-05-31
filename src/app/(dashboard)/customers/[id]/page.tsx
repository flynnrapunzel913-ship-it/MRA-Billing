"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { paymentStatusLabel } from "@/lib/constants";

export default function CustomerDetailPage() {
  const params = useParams();
  const [customer, setCustomer] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  const loadCustomer = async () => {
    const res = await fetch(`/api/customers/${params.id}`);
    setCustomer(await res.json());
  };

  useEffect(() => {
    loadCustomer();
  }, [params.id]);

  if (!customer) {
    return <div className="py-20 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/customers"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{customer.name}</h2>
          <p className="text-sm text-muted-foreground">{customer.membershipId}</p>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>Edit</Button>
        <Button asChild>
          <Link
            href={`/invoices/new?customerName=${encodeURIComponent(customer.name)}&customerMobile=${encodeURIComponent(customer.mobile || "")}&customerAddress=${encodeURIComponent(customer.address || "")}`}
          >
            Create Invoice
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Contact Details</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Mobile:</span> {customer.mobile || "-"}</p>
          <p><span className="text-muted-foreground">Email:</span> {customer.email || "-"}</p>
          <p><span className="text-muted-foreground">Address:</span> {customer.address || "-"}</p>
          <p><span className="text-muted-foreground">GST:</span> {customer.gstNumber || "-"}</p>
          <p><span className="text-muted-foreground">Joined:</span> {formatDate(customer.dateJoined)}</p>
          <Badge variant={customer.status === "ACTIVE" ? "success" : "secondary"}>{customer.status}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customer.invoices.map((invoice: any) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Link href={`/invoices/${invoice.id}`} className="text-primary hover:underline">
                      {invoice.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                  <TableCell>{formatCurrency(Number(invoice.grandTotal))}</TableCell>
                  <TableCell>
                    <Badge variant={invoice.paymentStatus === "FULLY_PAID" ? "success" : "warning"}>
                      {paymentStatusLabel(invoice.paymentStatus)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={loadCustomer}
        initialData={{
          id: customer.id,
          name: customer.name,
          mobile: customer.mobile || "",
          email: customer.email || "",
          address: customer.address || "",
          gstNumber: customer.gstNumber || "",
          status: customer.status,
        }}
      />
    </div>
  );
}
