"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { readApiResponse } from "@/lib/api-error";
import type { CatalogProduct } from "@/lib/catalog";

interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  edit?: CatalogProduct;
}

export function ProductFormDialog({ open, onClose, onSaved, edit }: ProductFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setName(edit.name);
      setDescription(edit.description ?? "");
      setPrice(String(edit.price));
      setStatus(edit.status);
    } else {
      setName("");
      setDescription("");
      setPrice("");
      setStatus("ACTIVE");
    }
  }, [open, edit]);

  const submit = async () => {
    setSaving(true);
    try {
      const body = {
        name,
        description: description || undefined,
        price: Number(price),
        status,
      };
      const url = edit ? `/api/admin/products/${edit.id}` : "/api/admin/products";
      const res = await fetch(url, {
        method: edit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await readApiResponse(res, "Failed to save product");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(edit ? "Product updated" : "Product created");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={edit ? "Edit Product" : "New Product"}
      description="Accessories and equipment sold at the academy"
      maxWidth="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#0070C0] hover:bg-[#005499]"
            disabled={saving}
            onClick={submit}
          >
            {saving ? "Saving…" : edit ? "Save Changes" : "Create Product"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Product Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Swimming Goggles" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details"
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Price (₹) *</Label>
          <Input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="450"
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as "ACTIVE" | "INACTIVE")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Modal>
  );
}
