"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Ban } from "lucide-react";
import { toast } from "sonner";
import type { PricingSection } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { readApiResponse } from "@/lib/api-error";
import { formatCurrency, cn } from "@/lib/utils";
import type { PricingRow, PricingSectionGroup } from "@/lib/subscription-pricing";
import type { SubscriptionPricingInput } from "@/lib/validations";
import { SubscriptionPricingFormDialog } from "@/components/admin/subscription-pricing-form-dialog";

const sectionCard = "rounded-xl border border-border/60 bg-card/40 p-5 sm:p-6";

export function SubscriptionPricingPanel() {
  const [sections, setSections] = useState<PricingSectionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formSection, setFormSection] = useState<PricingSection>("MONTHLY_PACKAGE");
  const [editRow, setEditRow] = useState<PricingRow | undefined>();
  const [deleteRow, setDeleteRow] = useState<PricingRow | undefined>();
  const [disableRow, setDisableRow] = useState<PricingRow | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subscription-pricing?format=grouped");
      const result = await readApiResponse<PricingSectionGroup[]>(res, "Failed to load price list");
      if (result.ok) setSections(Array.isArray(result.data) ? result.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveEntry = async (data: SubscriptionPricingInput) => {
    setSaving(true);
    try {
      const res = await fetch(
        editRow ? `/api/admin/subscription-pricing/${editRow.id}` : "/api/admin/subscription-pricing",
        {
          method: editRow ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      const result = await readApiResponse(res, "Failed to save");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(editRow ? "Updated" : "Added");
      setFormOpen(false);
      setEditRow(undefined);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDisable = async () => {
    if (!disableRow) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/subscription-pricing/${disableRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      const result = await readApiResponse(res, "Failed to disable");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Disabled");
      setDisableRow(undefined);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/subscription-pricing/${deleteRow.id}`, {
        method: "DELETE",
      });
      const result = await readApiResponse(res, "Failed to delete");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Deleted");
      setDeleteRow(undefined);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const openAdd = (section: PricingSection) => {
    setFormSection(section);
    setEditRow(undefined);
    setFormOpen(true);
  };

  const openEdit = (row: PricingRow) => {
    setFormSection(row.section);
    setEditRow(row);
    setFormOpen(true);
  };

  if (loading) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Loading price list…</p>;
  }

  return (
    <div className="space-y-8">
      {sections.map((group) => (
        <section key={group.section} className={sectionCard}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <h3 className="text-lg font-bold tracking-tight">{group.title}</h3>
            <Button variant="outline" size="sm" onClick={() => openAdd(group.section)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {group.addLabel}
            </Button>
          </div>

          {group.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "group flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0",
                    !item.isActive && "opacity-50"
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium">{item.label}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                    {!item.isActive && (
                      <p className="text-xs text-muted-foreground">Disabled</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-base font-semibold tabular-nums">
                      {formatCurrency(item.price)}
                    </span>
                    <div className="flex opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {item.isActive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => setDisableRow(item)}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteRow(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <SubscriptionPricingFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditRow(undefined);
        }}
        onSubmit={saveEntry}
        section={formSection}
        initial={editRow}
        saving={saving}
      />

      <Modal
        open={!!disableRow}
        onClose={() => setDisableRow(undefined)}
        title="Disable entry?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDisableRow(undefined)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={confirmDisable}>
              Disable
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Hide <strong>{disableRow?.label}</strong> from new invoices. Existing invoices are not
          affected.
        </p>
      </Modal>

      <Modal
        open={!!deleteRow}
        onClose={() => setDeleteRow(undefined)}
        title="Delete entry?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteRow(undefined)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={saving} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Permanently remove <strong>{deleteRow?.label}</strong>? Past invoices keep their
          snapshots.
        </p>
      </Modal>
    </div>
  );
}
