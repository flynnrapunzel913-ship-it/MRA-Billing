"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, IndianRupee, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { readApiResponse } from "@/lib/api-error";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { paymentStatusLabel, paymentStatusBadgeVariant } from "@/lib/constants";

interface CustomerStats {
  totalInvoices: number;
  totalAmountBilled: number;
  totalAmountPaid: number;
  outstandingBalance: number;
  lastInvoiceDate: string | null;
}

interface CustomerDetail {
  id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  membershipId: string;
  dateJoined: string;
  status: string;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    grandTotal: string | number;
    paymentStatus: string;
  }>;
  stats: CustomerStats;
}

function StatCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  return (
    <Card
      className={
        highlight
          ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10"
          : undefined
      }
    >
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CustomerDetailPage() {
  const params = useParams();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const loadCustomer = async () => {
    const res = await fetch(`/api/customers/${params.id}`);
    const result = await readApiResponse<CustomerDetail>(res, "Failed to load customer");
    if (result.ok) {
      setCustomer(result.data);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [params.id]);

  if (!customer) {
    return <div className="py-20 text-center text-muted-foreground">Loading...</div>;
  }

  const { stats } = customer;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold">{customer.name}</h2>
          <p className="text-sm text-muted-foreground">{customer.membershipId}</p>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          Edit
        </Button>
        <Button asChild>
          <Link href={`/invoices/new?customerId=${customer.id}`}>Create Invoice</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Invoices" value={String(stats.totalInvoices)} icon={FileText} />
        <StatCard
          label="Total Billed"
          value={formatCurrency(stats.totalAmountBilled)}
          icon={IndianRupee}
        />
        <StatCard
          label="Total Paid"
          value={formatCurrency(stats.totalAmountPaid)}
          icon={IndianRupee}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(stats.outstandingBalance)}
          icon={AlertCircle}
          highlight={stats.outstandingBalance > 0}
        />
        <StatCard
          label="Last Invoice"
          value={stats.lastInvoiceDate ? formatDate(stats.lastInvoiceDate) : "—"}
          icon={Calendar}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Mobile</p>
            <p className="font-medium">{customer.mobile || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Date Joined</p>
            <p className="font-medium">{formatDate(customer.dateJoined)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Customer ID</p>
            <p className="font-medium">{customer.membershipId}</p>
          </div>
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
          {customer.invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                    <TableCell>{formatCurrency(Number(invoice.grandTotal))}</TableCell>
                    <TableCell>
                      <Badge variant={paymentStatusBadgeVariant(invoice.paymentStatus)}>
                        {paymentStatusLabel(invoice.paymentStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank">
                          PDF
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
          status: customer.status,
        }}
      />
    </div>
  );
}
