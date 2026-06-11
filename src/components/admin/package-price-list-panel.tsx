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
import type { CatalogPackageGroup, CatalogPackageItem } from "@/lib/package-catalog";
import type { PackageGroupInput, PackageItemInput } from "@/lib/validations";
import { PackageGroupFormDialog } from "@/components/admin/package-group-form-dialog";
import { PackageItemFormDialog } from "@/components/admin/package-item-form-dialog";

const sectionCard = "rounded-xl border border-border/60 bg-card/40 p-5 sm:p-6";

export function PackagePriceListPanel() {
  const [search, setSearch] = useState("");
  const [groups, setGroups] = useState<CatalogPackageGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<CatalogPackageGroup | undefined>();
  const [disableGroup, setDisableGroup] = useState<CatalogPackageGroup | undefined>();

  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [itemGroup, setItemGroup] = useState<CatalogPackageGroup | undefined>();
  const [editItem, setEditItem] = useState<(CatalogPackageItem & { groupId: string }) | undefined>();
  const [disableItem, setDisableItem] = useState<(CatalogPackageItem & { groupId: string }) | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/admin/package-groups?${params}`);
      const result = await readApiResponse<CatalogPackageGroup[]>(res, "Failed to load price list");
      if (result.ok) setGroups(Array.isArray(result.data) ? result.data : []);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveGroup = async (data: PackageGroupInput) => {
    setSaving(true);
    try {
      const res = await fetch(
        editGroup ? `/api/admin/package-groups/${editGroup.id}` : "/api/admin/package-groups",
        {
          method: editGroup ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      const result = await readApiResponse(res, "Failed to save group");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(editGroup ? "Group updated" : "Group created");
      setGroupFormOpen(false);
      setEditGroup(undefined);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const saveItem = async (data: PackageItemInput) => {
    setSaving(true);
    try {
      const res = await fetch(
        editItem?.id ? `/api/admin/package-items/${editItem.id}` : "/api/admin/package-items",
        {
          method: editItem?.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      const result = await readApiResponse(res, "Failed to save item");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(editItem?.id ? "Item updated" : "Item added");
      setItemFormOpen(false);
      setEditItem(undefined);
      setItemGroup(undefined);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDisableGroup = async () => {
    if (!disableGroup) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/package-groups/${disableGroup.id}`, { method: "DELETE" });
      const result = await readApiResponse(res, "Failed to disable group");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Group disabled");
      setDisableGroup(undefined);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDisableItem = async () => {
    if (!disableItem) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/package-items/${disableItem.id}`, { method: "DELETE" });
      const result = await readApiResponse(res, "Failed to disable item");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Item disabled");
      setDisableItem(undefined);
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
            placeholder="Search groups or items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          onClick={() => {
            setEditGroup(undefined);
            setGroupFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Package Group
        </Button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading price list…</p>
      ) : groups.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No package groups yet. Create a group, then add items exactly as on your printed price sheet.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section
              key={group.id}
              className={cn(sectionCard, !group.isActive && "opacity-60")}
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold tracking-tight">{group.name}</h3>
                    {!group.isActive && <Badge variant="secondary">Inactive</Badge>}
                  </div>
                  {group.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setItemGroup(group);
                      setEditItem(undefined);
                      setItemFormOpen(true);
                    }}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Item
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditGroup(group);
                      setGroupFormOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {group.isActive && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDisableGroup(group)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {group.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items yet. Click Add Item.</p>
              ) : (
                <ul className="divide-y divide-border/50">
                  {group.items.map((item) => (
                    <li
                      key={item.id}
                      className={cn(
                        "group flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0",
                        !item.isActive && "opacity-50"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug">{item.title}</p>
                        {item.description && (
                          <p className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-base font-semibold tabular-nums">
                          {formatCurrency(item.price)}
                        </span>
                        <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setItemGroup(group);
                              setEditItem({ ...item, groupId: group.id });
                              setItemFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {item.isActive && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDisableItem({ ...item, groupId: group.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <PackageGroupFormDialog
        open={groupFormOpen}
        onClose={() => {
          setGroupFormOpen(false);
          setEditGroup(undefined);
        }}
        onSubmit={saveGroup}
        initial={editGroup}
        saving={saving}
      />

      {itemGroup && (
        <PackageItemFormDialog
          open={itemFormOpen}
          onClose={() => {
            setItemFormOpen(false);
            setEditItem(undefined);
            setItemGroup(undefined);
          }}
          onSubmit={saveItem}
          groupId={itemGroup.id}
          groupName={itemGroup.name}
          initial={
            editItem
              ? {
                  id: editItem.id,
                  groupId: editItem.groupId,
                  title: editItem.title,
                  price: editItem.price,
                  description: editItem.description,
                  isActive: editItem.isActive,
                }
              : undefined
          }
          saving={saving}
        />
      )}

      <Modal
        open={!!disableGroup}
        onClose={() => setDisableGroup(undefined)}
        title="Disable Package Group?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDisableGroup(undefined)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={saving} onClick={confirmDisableGroup}>
              Disable
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Hide <strong>{disableGroup?.name}</strong> from new invoices. Existing invoices are not
          affected.
        </p>
      </Modal>

      <Modal
        open={!!disableItem}
        onClose={() => setDisableItem(undefined)}
        title="Disable Package Item?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDisableItem(undefined)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={saving} onClick={confirmDisableItem}>
              Disable
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Hide <strong>{disableItem?.title}</strong> from new invoices. Existing invoices are not
          affected.
        </p>
      </Modal>
    </div>
  );
}
