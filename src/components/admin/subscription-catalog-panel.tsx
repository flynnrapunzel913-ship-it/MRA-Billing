"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { readApiResponse } from "@/lib/api-error";
import { formatCurrency, cn } from "@/lib/utils";
import type { CatalogCategory, CatalogPlan } from "@/lib/subscription-catalog";
import type {
  SubscriptionCategoryInput,
  SubscriptionPlanInput,
} from "@/lib/validations";
import { SubscriptionCategoryFormDialog } from "@/components/admin/subscription-category-form-dialog";
import { SubscriptionPlanFormDialog } from "@/components/admin/subscription-plan-form-dialog";

const sectionCard = "rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5";

export function SubscriptionCatalogPanel() {
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CatalogCategory | undefined>();
  const [disableCategory, setDisableCategory] = useState<CatalogCategory | undefined>();

  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [planCategory, setPlanCategory] = useState<CatalogCategory | undefined>();
  const [editPlan, setEditPlan] = useState<(CatalogPlan & { categoryId: string }) | undefined>();
  const [disablePlan, setDisablePlan] = useState<(CatalogPlan & { categoryId: string }) | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/admin/subscription-categories?${params}`);
      const result = await readApiResponse<CatalogCategory[]>(res, "Failed to load catalog");
      if (result.ok) setCategories(Array.isArray(result.data) ? result.data : []);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveCategory = async (data: SubscriptionCategoryInput) => {
    setSaving(true);
    try {
      const res = await fetch(
        editCategory
          ? `/api/admin/subscription-categories/${editCategory.id}`
          : "/api/admin/subscription-categories",
        {
          method: editCategory ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      const result = await readApiResponse(res, "Failed to save category");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(editCategory ? "Category updated" : "Category created");
      setCategoryFormOpen(false);
      setEditCategory(undefined);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const savePlan = async (data: SubscriptionPlanInput) => {
    setSaving(true);
    try {
      const res = await fetch(
        editPlan?.id ? `/api/admin/subscription-plans/${editPlan.id}` : "/api/admin/subscription-plans",
        {
          method: editPlan?.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      const result = await readApiResponse(res, "Failed to save plan");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(editPlan?.id ? "Plan updated" : "Plan created");
      setPlanFormOpen(false);
      setEditPlan(undefined);
      setPlanCategory(undefined);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDisableCategory = async () => {
    if (!disableCategory) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/subscription-categories/${disableCategory.id}`, {
        method: "DELETE",
      });
      const result = await readApiResponse(res, "Failed to disable category");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Category disabled");
      setDisableCategory(undefined);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDisablePlan = async () => {
    if (!disablePlan) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/subscription-plans/${disablePlan.id}`, {
        method: "DELETE",
      });
      const result = await readApiResponse(res, "Failed to disable plan");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Plan disabled");
      setDisablePlan(undefined);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search categories or plans…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          onClick={() => {
            setEditCategory(undefined);
            setCategoryFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Category
        </Button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading catalog…</p>
      ) : categories.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No subscription categories yet. Create your first category to add plans.
        </p>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <section key={category.id} className={cn(sectionCard, !category.isActive && "opacity-60")}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                    <Badge variant={category.isActive ? "success" : "secondary"}>
                      {category.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {category.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPlanCategory(category);
                      setEditPlan(undefined);
                      setPlanFormOpen(true);
                    }}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Plan
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditCategory(category);
                      setCategoryFormOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {category.isActive && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDisableCategory(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {category.plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No plans in this category.</p>
              ) : (
                <div className="space-y-2">
                  {category.plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/50 px-3 py-2",
                        !plan.isActive && "opacity-50"
                      )}
                    >
                      <div>
                        <p className="font-medium">{plan.planName}</p>
                        <p className="text-xs text-muted-foreground">
                          {plan.durationLabel || plan.description || "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold tabular-nums">{formatCurrency(plan.price)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setPlanCategory(category);
                            setEditPlan({ ...plan, categoryId: category.id });
                            setPlanFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {plan.isActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              setDisablePlan({ ...plan, categoryId: category.id })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <SubscriptionCategoryFormDialog
        open={categoryFormOpen}
        onClose={() => {
          setCategoryFormOpen(false);
          setEditCategory(undefined);
        }}
        onSubmit={saveCategory}
        initial={editCategory}
        saving={saving}
      />

      {planCategory && (
        <SubscriptionPlanFormDialog
          open={planFormOpen}
          onClose={() => {
            setPlanFormOpen(false);
            setEditPlan(undefined);
            setPlanCategory(undefined);
          }}
          onSubmit={savePlan}
          categoryId={planCategory.id}
          categoryName={planCategory.name}
          initial={
            editPlan
              ? {
                  id: editPlan.id,
                  categoryId: editPlan.categoryId,
                  planName: editPlan.planName,
                  price: editPlan.price,
                  durationValue: editPlan.durationValue,
                  durationUnit: editPlan.durationUnit,
                  sessionCount: editPlan.sessionCount,
                  validityDays: editPlan.validityDays,
                  description: editPlan.description,
                  isActive: editPlan.isActive,
                }
              : undefined
          }
          saving={saving}
        />
      )}

      <Modal
        open={!!disableCategory}
        onClose={() => setDisableCategory(undefined)}
        title="Disable Category?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDisableCategory(undefined)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={saving} onClick={confirmDisableCategory}>
              Disable
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          This will hide <strong>{disableCategory?.name}</strong> and its plans from new invoices.
          Existing invoices are not affected.
        </p>
      </Modal>

      <Modal
        open={!!disablePlan}
        onClose={() => setDisablePlan(undefined)}
        title="Disable Plan?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDisablePlan(undefined)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={saving} onClick={confirmDisablePlan}>
              Disable
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          This will hide <strong>{disablePlan?.planName}</strong> from new invoices. Existing
          invoices are not affected.
        </p>
      </Modal>
    </div>
  );
}
