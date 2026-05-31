"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  membershipId: string;
  status: string;
  dateJoined: string;
  _count: { invoices: number };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const loadCustomers = async (q = query) => {
    const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`);
    setCustomers(await res.json());
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCustomers(query);
  };

  const handleCreated = () => {
    setOpen(false);
    toast.success("Customer created");
    loadCustomers();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Customers</h2>
          <p className="text-sm text-muted-foreground">Manage academy members and billing history</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name, mobile, membership ID..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">Search</Button>
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Membership ID</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Link href={`/customers/${customer.id}`} className="font-medium text-primary hover:underline">
                      {customer.name}
                    </Link>
                  </TableCell>
                  <TableCell>{customer.mobile}</TableCell>
                  <TableCell>{customer.membershipId}</TableCell>
                  <TableCell>{formatDate(customer.dateJoined)}</TableCell>
                  <TableCell>{customer._count.invoices}</TableCell>
                  <TableCell>
                    <Badge variant={customer.status === "ACTIVE" ? "success" : "secondary"}>
                      {customer.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CustomerFormDialog open={open} onOpenChange={setOpen} onSuccess={handleCreated} />
    </div>
  );
}
