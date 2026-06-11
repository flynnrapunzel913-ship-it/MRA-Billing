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
import type { SubscriptionPlanRow } from "@/lib/subscription-plans";

interface SubscriptionPlanFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  edit?: SubscriptionPlanRow;
}

export function SubscriptionPlanFormDialog({
  open,
  onClose,
  onSaved,
  edit,
}: SubscriptionPlanFormDialogProps) {
  const [planName, setPlanName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [fees, setFees] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setPlanName(edit.planName);
      setDescription(edit.description ?? "");
      setDuration(edit.duration);
      setFees(String(edit.fees));
      setIsActive(edit.isActive);
    } else {
      setPlanName("");
      setDescription("");
      setDuration("");
      setFees("");
      setIsActive(true);
    }
  }, [open, edit]);

  const submit = async () => {
    if (!planName.trim()) {
      toast.error("Plan name is required");
      return;
    }
    if (!duration.trim()) {
      toast.error("Duration is required");
      return;
    }
    const feesNum = Number(fees);
    if (!Number.isFinite(feesNum) || feesNum < 0) {
      toast.error("Enter a valid fee amount");
      return;
    }

    setSaving(true);
    try {
      const body = {
        planName: planName.trim(),
        description: description.trim() || null,
        duration: duration.trim(),
        fees: feesNum,
        isActive,
      };
      const url = edit ? `/api/admin/subscription-plans/${edit.id}` : "/api/admin/subscription-plans";
      const res = await fetch(url, {
        method: edit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await readApiResponse(res, "Failed to save plan");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(edit ? "Plan updated" : "Plan created");
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
      title={edit ? "Edit Plan" : "Add Plan"}
      description="Subscription offering for invoices"
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
            {saving ? "Saving…" : edit ? "Save Changes" : "Add Plan"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Plan Name *</Label>
          <Input
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="1 Month Swimming"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Monthly Package Without Coaching"
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Duration *</Label>
          <Input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="1 Month"
          />
        </div>
        <div className="space-y-2">
          <Label>Fees (₹) *</Label>
          <Input
            type="number"
            min={0}
            value={fees}
            onChange={(e) => setFees(e.target.value)}
            placeholder="3540"
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={isActive ? "ACTIVE" : "INACTIVE"}
            onValueChange={(v) => setIsActive(v === "ACTIVE")}
          >
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
