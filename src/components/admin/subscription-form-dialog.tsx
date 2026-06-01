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
import type { CatalogSubscription } from "@/lib/catalog";

interface SubscriptionFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  edit?: CatalogSubscription;
}

export function SubscriptionFormDialog({
  open,
  onClose,
  onSaved,
  edit,
}: SubscriptionFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setName(edit.name);
      setDescription(edit.description ?? "");
      setDuration(edit.duration);
      setPrice(String(edit.price));
      setStatus(edit.status);
    } else {
      setName("");
      setDescription("");
      setDuration("");
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
        duration,
        price: Number(price),
        status,
      };
      const url = edit ? `/api/admin/subscriptions/${edit.id}` : "/api/admin/subscriptions";
      const res = await fetch(url, {
        method: edit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await readApiResponse(res, "Failed to save subscription");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(edit ? "Subscription updated" : "Subscription created");
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
      title={edit ? "Edit Subscription" : "New Subscription"}
      description="Packages and coaching plans for invoice billing"
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
            {saving ? "Saving…" : edit ? "Save Changes" : "Create Subscription"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Subscription Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Monthly Swimming" />
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
          <Label>Duration *</Label>
          <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="1 Month" />
        </div>
        <div className="space-y-2">
          <Label>Price (₹) *</Label>
          <Input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="2500"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
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
