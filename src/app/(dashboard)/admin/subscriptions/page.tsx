"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Package, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { readApiResponse } from "@/lib/api-error";
import { formatCurrency, cn } from "@/lib/utils";
import type { CatalogSubscription, CatalogProduct } from "@/lib/catalog";
import { SubscriptionFormDialog } from "@/components/admin/subscription-form-dialog";
import { ProductFormDialog } from "@/components/admin/product-form-dialog";

type Tab = "subscriptions" | "products";

const glassCard = cn(
  "rounded-xl border backdrop-blur-md",
  "border-[#E2E8F0]/90 bg-white/90 shadow-[0_4px_24px_rgba(0,112,192,0.07)]",
  "dark:border-white/10 dark:bg-card/85"
);

function StatusBadge({ status }: { status: "ACTIVE" | "INACTIVE" }) {
  return (
    <Badge variant={status === "ACTIVE" ? "success" : "secondary"}>
      {status === "ACTIVE" ? "Active" : "Inactive"}
    </Badge>
  );
}

export default function SubscriptionManagementPage() {
  const [tab, setTab] = useState<Tab>("subscriptions");
  const [search, setSearch] = useState("");
  const [subscriptions, setSubscriptions] = useState<CatalogSubscription[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [subFormOpen, setSubFormOpen] = useState(false);
  const [editSub, setEditSub] = useState<CatalogSubscription | undefined>();
  const [deleteSub, setDeleteSub] = useState<CatalogSubscription | undefined>();

  const [prodFormOpen, setProdFormOpen] = useState(false);
  const [editProd, setEditProd] = useState<CatalogProduct | undefined>();
  const [deleteProd, setDeleteProd] = useState<CatalogProduct | undefined>();
  const [deleting, setDeleting] = useState(false);

  const loadSubscriptions = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    const res = await fetch(`/api/admin/subscriptions?${params}`);
    const result = await readApiResponse<CatalogSubscription[]>(res, "Failed to load subscriptions");
    if (result.ok) setSubscriptions(Array.isArray(result.data) ? result.data : []);
  }, [search]);

  const loadProducts = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    const res = await fetch(`/api/admin/products?${params}`);
    const result = await readApiResponse<CatalogProduct[]>(res, "Failed to load products");
    if (result.ok) setProducts(Array.isArray(result.data) ? result.data : []);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "subscriptions") await loadSubscriptions();
      else await loadProducts();
    } finally {
      setLoading(false);
    }
  }, [tab, loadSubscriptions, loadProducts]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleteSub && !deleteProd) return;
    setDeleting(true);
    try {
      const url = deleteSub
        ? `/api/admin/subscriptions/${deleteSub.id}`
        : `/api/admin/products/${deleteProd!.id}`;
      const res = await fetch(url, { method: "DELETE" });
      const result = await readApiResponse(res, "Failed to delete");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(deleteSub ? "Subscription deleted" : "Product deleted");
      setDeleteSub(undefined);
      setDeleteProd(undefined);
      load();
    } finally {
      setDeleting(false);
    }
  };

  const toggleStatus = async (
    type: Tab,
    id: string,
    current: "ACTIVE" | "INACTIVE",
    record: CatalogSubscription | CatalogProduct
  ) => {
    const next = current === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const url =
      type === "subscriptions"
        ? `/api/admin/subscriptions/${id}`
        : `/api/admin/products/${id}`;
    const body =
      type === "subscriptions"
        ? {
            name: (record as CatalogSubscription).name,
            description: record.description,
            duration: (record as CatalogSubscription).duration,
            price: record.price,
            status: next,
          }
        : {
            name: record.name,
            description: record.description,
            price: record.price,
            status: next,
          };

    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await readApiResponse(res, "Failed to update status");
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(next === "ACTIVE" ? "Marked active" : "Marked inactive");
    load();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Subscription Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage packages and products available on invoices
          </p>
        </div>
        <Button
          className="bg-[#0070C0] hover:bg-[#005499]"
          onClick={() => {
            if (tab === "subscriptions") {
              setEditSub(undefined);
              setSubFormOpen(true);
            } else {
              setEditProd(undefined);
              setProdFormOpen(true);
            }
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {tab === "subscriptions" ? "New Subscription" : "New Product"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={tab === "subscriptions" ? "default" : "outline"}
          className={tab === "subscriptions" ? "bg-[#0070C0] hover:bg-[#005499]" : ""}
          onClick={() => {
            setTab("subscriptions");
            setSearch("");
          }}
        >
          <Package className="mr-2 h-4 w-4" />
          Subscriptions
        </Button>
        <Button
          type="button"
          variant={tab === "products" ? "default" : "outline"}
          className={tab === "products" ? "bg-[#0070C0] hover:bg-[#005499]" : ""}
          onClick={() => {
            setTab("products");
            setSearch("");
          }}
        >
          <ShoppingBag className="mr-2 h-4 w-4" />
          Products
        </Button>
      </div>

      <Card className={glassCard}>
        <CardHeader className="border-b border-[#E2E8F0]/80 pb-4 dark:border-white/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              {tab === "subscriptions" ? "Subscriptions / Packages" : "Products / Accessories"}
            </CardTitle>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 pl-9"
                placeholder={
                  tab === "subscriptions" ? "Search subscriptions…" : "Search products…"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">Loading…</p>
          ) : tab === "subscriptions" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No subscriptions yet. Create your first package.
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <p className="font-semibold">{sub.name}</p>
                        {sub.description && (
                          <p className="text-xs text-muted-foreground">{sub.description}</p>
                        )}
                      </TableCell>
                      <TableCell>{sub.duration}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(sub.price)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sub.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toggleStatus("subscriptions", sub.id, sub.status, sub)
                            }
                          >
                            {sub.status === "ACTIVE" ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditSub(sub);
                              setSubFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteSub(sub)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      No products yet. Add accessories and equipment.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((prod) => (
                    <TableRow key={prod.id}>
                      <TableCell>
                        <p className="font-semibold">{prod.name}</p>
                        {prod.description && (
                          <p className="text-xs text-muted-foreground">{prod.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(prod.price)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={prod.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatus("products", prod.id, prod.status, prod)}
                          >
                            {prod.status === "ACTIVE" ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditProd(prod);
                              setProdFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteProd(prod)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SubscriptionFormDialog
        open={subFormOpen}
        onClose={() => setSubFormOpen(false)}
        onSaved={loadSubscriptions}
        edit={editSub}
      />
      <ProductFormDialog
        open={prodFormOpen}
        onClose={() => setProdFormOpen(false)}
        onSaved={loadProducts}
        edit={editProd}
      />

      <Modal
        open={!!deleteSub || !!deleteProd}
        onClose={() => {
          setDeleteSub(undefined);
          setDeleteProd(undefined);
        }}
        title={deleteSub ? "Delete Subscription" : "Delete Product"}
        description="This cannot be undone. Existing invoices are not affected."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteSub(undefined);
                setDeleteProd(undefined);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Remove <strong>{deleteSub?.name ?? deleteProd?.name}</strong> from the catalog?
        </p>
      </Modal>
    </div>
  );
}
