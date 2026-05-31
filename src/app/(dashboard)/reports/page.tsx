"use client";

import { useEffect, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

const reportTypes = [
  { value: "revenue", label: "Revenue Report" },
  { value: "gst", label: "GST Report" },
  { value: "customers", label: "Customer Report" },
  { value: "items", label: "Item Type Sales Report" },
];

export default function ReportsPage() {
  const [type, setType] = useState("revenue");
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<any>(null);

  const loadReport = async () => {
    const params = new URLSearchParams({ type, period });
    if (period === "custom") {
      params.set("startDate", startDate);
      params.set("endDate", endDate);
    }
    const res = await fetch(`/api/reports?${params}`);
    if (!res.ok) {
      toast.error("Failed to load report");
      return;
    }
    setData(await res.json());
  };

  useEffect(() => {
    loadReport();
  }, [type, period]);

  const exportExcel = () => {
    if (!data?.rows) return;
    const ws = XLSX.utils.json_to_sheet(
      data.rows.map((row: any) => flattenRow(row))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type);
    XLSX.writeFile(wb, `mra-${type}-report.xlsx`);
    toast.success("Excel exported");
  };

  const exportPdf = () => {
    window.print();
    toast.success("Use browser print to save as PDF");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Reports</h2>
        <p className="text-sm text-muted-foreground">Financial and operational reports with export</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {reportTypes.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom">Custom Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {period === "custom" && (
            <>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </>
          )}
          <div className="flex items-end gap-2 md:col-span-4">
            <Button onClick={loadReport}>Apply Filters</Button>
            <Button variant="outline" onClick={exportExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />Export Excel
            </Button>
            <Button variant="outline" onClick={exportPdf}>
              <Download className="mr-2 h-4 w-4" />Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <Card>
          <CardHeader>
            <CardTitle>
              {reportTypes.find((r) => r.value === type)?.label}
              {data.total !== undefined && ` - ${formatCurrency(data.total)}`}
              {data.summary && ` - GST ${formatCurrency(data.summary.totalGst)}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReportTable type={type} rows={data.rows || []} summary={data.summary} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function flattenRow(row: any) {
  return JSON.parse(JSON.stringify(row, (_, value) =>
    typeof value === "object" && value !== null ? value : value
  ));
}

function ReportTable({ type, rows, summary }: { type: string; rows: any[]; summary?: any }) {
  if (type === "revenue") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead>Amount Paid</TableHead>
            <TableHead>Payment Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{formatDate(row.invoiceDate)}</TableCell>
              <TableCell>{row.customerName}</TableCell>
              <TableCell>{row.invoiceNumber}</TableCell>
              <TableCell>{formatCurrency(Number(row.amountPaid))}</TableCell>
              <TableCell>{row.paymentStatus === "FULLY_PAID" ? "Fully Paid" : "Partially Paid"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (type === "gst") {
    return (
      <>
        {summary && (
          <div className="mb-4 grid gap-2 text-sm sm:grid-cols-4">
            <p>Subtotal: {formatCurrency(summary.subtotal)}</p>
            <p>CGST: {formatCurrency(summary.cgst)}</p>
            <p>SGST: {formatCurrency(summary.sgst)}</p>
            <p>Grand Total: {formatCurrency(summary.grandTotal)}</p>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>CGST</TableHead>
              <TableHead>SGST</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.invoiceNumber}</TableCell>
                <TableCell>{formatDate(row.invoiceDate)}</TableCell>
                <TableCell>{row.customerName}</TableCell>
                <TableCell>{formatCurrency(Number(row.cgstAmount))}</TableCell>
                <TableCell>{formatCurrency(Number(row.sgstAmount))}</TableCell>
                <TableCell>{formatCurrency(Number(row.grandTotal))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </>
    );
  }

  if (type === "customers") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Membership</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Invoices</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.mobile}</TableCell>
              <TableCell>{row.membershipId}</TableCell>
              <TableCell>{formatDate(row.dateJoined)}</TableCell>
              <TableCell>{row._count?.invoices || 0}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item Type</TableHead>
          <TableHead>Quantity Sold</TableHead>
          <TableHead>Revenue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={i}>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.count}</TableCell>
            <TableCell>{formatCurrency(row.revenue)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
