"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  subscriptionPlanSchema,
  type SubscriptionPlanInput,
} from "@/lib/validations";

const DURATION_UNITS = ["DAY", "MONTH", "YEAR", "CLASS", "HOUR", "CUSTOM"] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SubscriptionPlanInput) => Promise<void>;
  categoryId: string;
  categoryName: string;
  initial?: Partial<SubscriptionPlanInput> & { id?: string };
  saving?: boolean;
};

export function SubscriptionPlanFormDialog({
  open,
  onClose,
  onSubmit,
  categoryId,
  categoryName,
  initial,
  saving,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SubscriptionPlanInput>({
    resolver: zodResolver(subscriptionPlanSchema),
    defaultValues: {
      categoryId,
      planName: "",
      price: 0,
      durationValue: null,
      durationUnit: "MONTH",
      sessionCount: null,
      validityDays: null,
      description: "",
      isActive: true,
    },
  });

  const durationUnit = watch("durationUnit");
  const isActive = watch("isActive");

  useEffect(() => {
    if (!open) return;
    reset({
      categoryId,
      planName: initial?.planName ?? "",
      price: initial?.price ?? 0,
      durationValue: initial?.durationValue ?? null,
      durationUnit: initial?.durationUnit ?? "MONTH",
      sessionCount: initial?.sessionCount ?? null,
      validityDays: initial?.validityDays ?? null,
      description: initial?.description ?? "",
      isActive: initial?.isActive ?? true,
    });
  }, [open, initial, categoryId, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.id ? "Edit Plan" : "New Plan"}
      description={categoryName}
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={handleSubmit(onSubmit)}>
            {saving ? "Saving…" : initial?.id ? "Save Plan" : "Create Plan"}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label>Plan Name</Label>
          <Input {...register("planName")} placeholder="1 Month" />
          {errors.planName && <p className="text-sm text-destructive">{errors.planName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Price (₹)</Label>
          <Input type="number" step="0.01" {...register("price", { valueAsNumber: true })} />
          {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Duration Value</Label>
            <Input
              type="number"
              {...register("durationValue", {
                setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
              })}
            />
          </div>
          <div className="space-y-2">
            <Label>Duration Unit</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={durationUnit ?? "MONTH"}
              onChange={(e) =>
                setValue("durationUnit", e.target.value as SubscriptionPlanInput["durationUnit"])
              }
            >
              {DURATION_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>
        {durationUnit === "CLASS" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Session Count</Label>
              <Input
                type="number"
                {...register("sessionCount", {
                  setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Validity Days</Label>
              <Input
                type="number"
                {...register("validityDays", {
                  setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                })}
              />
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <Textarea {...register("description")} rows={2} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setValue("isActive", e.target.checked)}
          />
          Active
        </label>
      </form>
    </Modal>
  );
}
