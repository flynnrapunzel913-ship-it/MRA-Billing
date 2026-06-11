"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Package, ShoppingBag, Search } from "lucide-react";
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
import type { CatalogProduct } from "@/lib/catalog";
import type { SubscriptionPlanRow } from "@/lib/subscription-plans";
import { SubscriptionPlanFormDialog } from "@/components/admin/subscription-plan-form-dialog";
import { ProductFormDialog } from "@/components/admin/product-form-dialog";

type Tab = "subscriptions" | "products";

const glassCard = cn(
  "rounded-xl border backdrop-blur-md",
  "border-[#E2E8F0]/90 bg-white/90 shadow-[0_4px_24px_rgba(0,112,192,0.07)]",
  "dark:border-white/10 dark:bg-card/85"
);

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "success" : "secondary"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

export default function SubscriptionManagementPage() {
  const [tab, setTab] = useState<Tab>("subscriptions");
  const [search, setSearch] = useState("");
  const [plans, setPlans] = useState<SubscriptionPlanRow[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<SubscriptionPlanRow | undefined>();
  const [deletePlan, setDeletePlan] = useState<SubscriptionPlanRow | undefined>();

  const [prodFormOpen, setProdFormOpen] = useState(false);
  const [editProd, setEditProd] = useState<CatalogProduct | undefined>();
  const [deleteProd, setDeleteProd] = useState<CatalogProduct | undefined>();
  const [deleting, setDeleting] = useState(false);

  const loadPlans = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    const res = await fetch(`/api/admin/subscription-plans?${params}`);
    const result = await readApiResponse<SubscriptionPlanRow[]>(res, "Failed to load plans");
    if (result.ok) setPlans(Array.isArray(result.data) ? result.data : []);
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
      if (tab === "subscriptions") await loadPlans();
      else await loadProducts();
    } finally {
      setLoading(false);
    }
  }, [tab, loadPlans, loadProducts]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDeletePlan = async () => {
    if (!deletePlan) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/subscription-plans/${deletePlan.id}`, { method: "DELETE" });
      const result = await readApiResponse(res, "Failed to delete");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Plan deleted");
      setDeletePlan(undefined);
      await loadPlans();
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProd) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${deleteProd.id}`, { method: "DELETE" });
      const result = await readApiResponse(res, "Failed to delete");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Product deleted");
      setDeleteProd(undefined);
      await loadProducts();
    } finally {
      setDeleting(false);
    }
  };

  const togglePlanStatus = async (record: SubscriptionPlanRow) => {
    const res = await fetch(`/api/admin/subscription-plans/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planName: record.planName,
        description: record.description,
        duration: record.duration,
        fees: record.fees,
        isActive: !record.isActive,
      }),
    });
    const result = await readApiResponse(res, "Failed to update status");
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(record.isActive ? "Marked inactive" : "Marked active");
    await loadPlans();
  };

  const toggleProductStatus = async (id: string, current: "ACTIVE" | "INACTIVE", record: CatalogProduct) => {
    const next = current === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: record.name,
        description: record.description,
        price: record.price,
        status: next,
      }),
    });
    const result = await readApiResponse(res, "Failed to update status");
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(next === "ACTIVE" ? "Marked active" : "Marked inactive");
    await loadProducts();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Subscription Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage subscription plans and products for invoices
          </p>
        </div>
        {tab === "subscriptions" ? (
          <Button
            className="bg-[#0070C0] hover:bg-[#005499]"
            onClick={() => {
              setEditPlan(undefined);
              setPlanFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Plan
          </Button>
        ) : (
          <Button
            className="bg-[#0070C0] hover:bg-[#005499]"
            onClick={() => {
              setEditProd(undefined);
              setProdFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Product
          </Button>
        )}
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
              {tab === "subscriptions" ? "Subscription Plans" : "Products / Accessories"}
            </CardTitle>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 pl-9"
                placeholder={tab === "subscriptions" ? "Search plans…" : "Search products…"}
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
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No subscription plans yet. Click Add Plan to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-semibold">{plan.planName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {plan.description || "—"}
                      </TableCell>
                      <TableCell>{plan.duration}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(plan.fees)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge active={plan.isActive} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePlanStatus(plan)}
                          >
                            {plan.isActive ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditPlan(plan);
                              setPlanFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletePlan(plan)}
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
                        <StatusBadge active={prod.status === "ACTIVE"} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleProductStatus(prod.id, prod.status, prod)}
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

      <SubscriptionPlanFormDialog
        open={planFormOpen}
        onClose={() => setPlanFormOpen(false)}
        onSaved={loadPlans}
        edit={editPlan}
      />

      <ProductFormDialog
        open={prodFormOpen}
        onClose={() => setProdFormOpen(false)}
        onSaved={loadProducts}
        edit={editProd}
      />

      <Modal
        open={!!deletePlan}
        onClose={() => setDeletePlan(undefined)}
        title="Delete Plan"
        description="This cannot be undone. Existing invoices are not affected."
        footer={
          <>
            <Button variant="outline" onClick={() => setDeletePlan(undefined)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDeletePlan}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Remove <strong>{deletePlan?.planName}</strong> from the catalog?
        </p>
      </Modal>

      <Modal
        open={!!deleteProd}
        onClose={() => setDeleteProd(undefined)}
        title="Delete Product"
        description="This cannot be undone. Existing invoices are not affected."
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteProd(undefined)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDeleteProduct}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Remove <strong>{deleteProd?.name}</strong> from the catalog?
        </p>
      </Modal>
    </div>
  );
}
