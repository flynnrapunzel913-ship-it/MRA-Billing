"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IndianRupee,
  FileText,
  Users,
  Clock,
  Plus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { paymentStatusLabel } from "@/lib/constants";

const COLORS = ["#0070C0", "#38bdf8", "#0ea5e9", "#0284c7", "#0369a1"];

interface DashboardData {
  totalRevenue: number;
  monthlyRevenue: number;
  invoiceCount: number;
  activeStudents: number;
  pendingPayments: number;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    grandTotal: string | number;
    paymentStatus: string;
    invoiceDate: string;
  }>;
  monthlyRevenueData: Array<{ name: string; revenue: number }>;
  itemTypeDistribution: Array<{ name: string; value: number }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) {
    return <div className="py-20 text-center text-muted-foreground">Loading dashboard...</div>;
  }

  const stats = [
    { label: "Total Revenue", value: formatCurrency(data.totalRevenue), icon: IndianRupee },
    { label: "Monthly Revenue", value: formatCurrency(data.monthlyRevenue), icon: IndianRupee },
    { label: "Invoices Generated", value: data.invoiceCount, icon: FileText },
    { label: "Active Students", value: data.activeStudents, icon: Users },
    { label: "Pending Payments", value: data.pendingPayments, icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Overview of academy billing performance</p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-primary/10 p-3 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Chart</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="revenue" fill="#0070C0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Item Type Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.itemTypeDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {data.itemTypeDistribution.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentInvoices.map((invoice) => (
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
    </div>
  );
}
