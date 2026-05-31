"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { Plus, Search, Trash2 } from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";

import { formatCurrency, formatDate } from "@/lib/utils";

import { paymentStatusLabel, paymentStatusBadgeVariant } from "@/lib/constants";

import { filterInvoicesByQuery } from "@/lib/invoice-search";

import { useDebouncedValue } from "@/lib/use-debounced-value";

import { DeleteInvoiceDialog } from "@/components/invoices/delete-invoice-dialog";



interface InvoiceRow {

  id: string;

  invoiceNumber: string;

  customerName: string;

  invoiceDate: string;

  grandTotal: string | number;

  paymentStatus: string;

}



export default function InvoicesPage() {

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  const [query, setQuery] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null);

  const [deleting, setDeleting] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 300);



  const loadInvoices = useCallback(async () => {

    const res = await fetch("/api/invoices");

    if (res.ok) {

      setInvoices(await res.json());

    } else {

      setInvoices([]);

    }

  }, []);



  useEffect(() => {

    loadInvoices();

  }, [loadInvoices]);



  const filteredInvoices = useMemo(

    () => filterInvoicesByQuery(invoices, debouncedQuery),

    [invoices, debouncedQuery]

  );



  const handleDelete = async () => {

    if (!deleteTarget) return;

    setDeleting(true);

    try {

      const res = await fetch(`/api/invoices/${deleteTarget.id}`, { method: "DELETE" });

      if (!res.ok) {

        toast.error("Failed to delete invoice");

        return;

      }

      toast.success("Invoice deleted successfully");

      setDeleteTarget(null);

      await loadInvoices();

    } catch {

      toast.error("Failed to delete invoice");

    } finally {

      setDeleting(false);

    }

  };



  return (

    <div className="space-y-6">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <h2 className="text-2xl font-bold">Invoices</h2>

          <p className="text-sm text-muted-foreground">Create, search, and print GST invoices</p>

        </div>

        <Button asChild>

          <Link href="/invoices/new"><Plus className="mr-2 h-4 w-4" />New Invoice</Link>

        </Button>

      </div>



      <Card>

        <CardHeader>

          <div className="relative flex-1">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input

              className="pl-9"

              placeholder="Search invoice number or customer..."

              value={query}

              onChange={(e) => setQuery(e.target.value)}

            />

          </div>

        </CardHeader>

        <CardContent>

          <Table>

            <TableHeader>

              <TableRow>

                <TableHead>Invoice No</TableHead>

                <TableHead>Customer</TableHead>

                <TableHead>Date</TableHead>

                <TableHead>Amount</TableHead>

                <TableHead>Payment</TableHead>

                <TableHead>Actions</TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {filteredInvoices.length === 0 ? (

                <TableRow>

                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">

                    No invoices found

                  </TableCell>

                </TableRow>

              ) : (

                filteredInvoices.map((invoice) => (

                  <TableRow key={invoice.id}>

                    <TableCell>

                      <Link href={`/invoices/${invoice.id}`} className="font-medium text-primary hover:underline">

                        {invoice.invoiceNumber}

                      </Link>

                    </TableCell>

                    <TableCell>{invoice.customerName}</TableCell>

                    <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>

                    <TableCell>{formatCurrency(Number(invoice.grandTotal))}</TableCell>

                    <TableCell>

                      <Badge variant={paymentStatusBadgeVariant(invoice.paymentStatus)}>

                        {paymentStatusLabel(invoice.paymentStatus)}

                      </Badge>

                    </TableCell>

                    <TableCell>

                      <div className="flex items-center gap-1">

                        <Button variant="outline" size="sm" asChild>

                          <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank">PDF</a>

                        </Button>

                        <Button

                          variant="ghost"

                          size="icon"

                          className="h-8 w-8 text-muted-foreground hover:text-destructive"

                          onClick={() => setDeleteTarget(invoice)}

                          aria-label={`Delete ${invoice.invoiceNumber}`}

                        >

                          <Trash2 className="h-4 w-4" />

                        </Button>

                      </div>

                    </TableCell>

                  </TableRow>

                ))

              )}

            </TableBody>

          </Table>

        </CardContent>

      </Card>



      <DeleteInvoiceDialog

        open={!!deleteTarget}

        invoiceNumber={deleteTarget?.invoiceNumber ?? ""}

        loading={deleting}

        onCancel={() => setDeleteTarget(null)}

        onConfirm={handleDelete}

      />

    </div>

  );

}

