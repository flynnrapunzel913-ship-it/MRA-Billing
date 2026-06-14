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
import {
  SUBSCRIPTION_DURATION_UNITS,
  SUBSCRIPTION_DURATION_UNIT_LABELS,
  formatDurationLabel,
  formatPlanCoverageSummary,
  type SubscriptionDurationUnit,
} from "@/lib/subscription-duration";

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
  const [usageDays, setUsageDays] = useState("");
  const [durationValue, setDurationValue] = useState("1");
  const [durationUnit, setDurationUnit] = useState<SubscriptionDurationUnit>("MONTHS");
  const [fees, setFees] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setPlanName(edit.planName);
      setDescription(edit.description ?? "");
      setUsageDays(edit.usageDays != null ? String(edit.usageDays) : "");
      setDurationValue(String(edit.durationValue));
      setDurationUnit(edit.durationUnit);
      setFees(String(edit.fees));
      setIsActive(edit.isActive);
    } else {
      setPlanName("");
      setDescription("");
      setUsageDays("");
      setDurationValue("1");
      setDurationUnit("MONTHS");
      setFees("");
      setIsActive(true);
    }
  }, [open, edit]);

  const validityPreview = formatDurationLabel(
    Math.max(1, Number(durationValue) || 1),
    durationUnit
  );
  const coveragePreview = formatPlanCoverageSummary({
    usageDays: usageDays.trim() ? Math.max(1, Number(usageDays) || 0) : null,
    durationValue: Math.max(1, Number(durationValue) || 1),
    durationUnit,
  });

  const submit = async () => {
    if (!planName.trim()) {
      toast.error("Plan name is required");
      return;
    }
    const validityNum = Number(durationValue);
    if (!Number.isFinite(validityNum) || validityNum < 1) {
      toast.error("Enter a valid validity period");
      return;
    }
    const usageNum = usageDays.trim() ? Number(usageDays) : null;
    if (usageNum != null && (!Number.isFinite(usageNum) || usageNum < 1)) {
      toast.error("Enter a valid usage days count");
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
        usageDays: usageNum != null ? Math.floor(usageNum) : null,
        durationValue: Math.floor(validityNum),
        durationUnit,
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
      description="Set usage days and validity window for invoices"
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
            placeholder="21 Classes Coaching"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes for staff"
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Usage Days</Label>
          <Input
            type="number"
            min={1}
            step={1}
            value={usageDays}
            onChange={(e) => setUsageDays(e.target.value)}
            placeholder="21"
          />
          <p className="text-xs text-muted-foreground">
            Swim/class days included. Leave blank for unlimited within validity.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Validity Period *</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              step={1}
              className="w-24"
              value={durationValue}
              onChange={(e) => setDurationValue(e.target.value)}
              placeholder="1"
            />
            <Select
              value={durationUnit}
              onValueChange={(v) => setDurationUnit(v as SubscriptionDurationUnit)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_DURATION_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {SUBSCRIPTION_DURATION_UNIT_LABELS[unit]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Invoice end date uses {validityPreview}. Plan: {coveragePreview}
          </p>
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
