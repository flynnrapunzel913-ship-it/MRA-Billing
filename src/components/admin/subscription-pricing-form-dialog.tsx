"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { PricingSection } from "@prisma/client";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  subscriptionPricingSchema,
  type SubscriptionPricingInput,
} from "@/lib/validations";
import {
  PRICING_SECTION_META,
  monthlyPackageLabel,
  parseMonthsFromMonthlyLabel,
  type PricingRow,
} from "@/lib/subscription-pricing";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SubscriptionPricingInput) => Promise<void>;
  section: PricingSection;
  initial?: PricingRow;
  saving?: boolean;
};

export function SubscriptionPricingFormDialog({
  open,
  onClose,
  onSubmit,
  section,
  initial,
  saving,
}: Props) {
  const meta = PRICING_SECTION_META[section];
  const isMonthly = section === "MONTHLY_PACKAGE";
  const [months, setMonths] = useState(1);
  const [monthsError, setMonthsError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SubscriptionPricingInput>({
    resolver: zodResolver(subscriptionPricingSchema),
    defaultValues: {
      section,
      label: "",
      price: 0,
      description: "",
      isActive: true,
    },
  });

  const isActive = watch("isActive");

  useEffect(() => {
    if (!open) return;
    const parsedMonths = initial ? parseMonthsFromMonthlyLabel(initial.label) : null;
    const monthCount = parsedMonths ?? 1;
    setMonths(monthCount);
    setMonthsError("");
    reset(
      initial
        ? {
            section: initial.section,
            label: initial.label,
            price: initial.price,
            description: initial.description ?? "",
            isActive: initial.isActive,
          }
        : {
            section,
            label: isMonthly ? monthlyPackageLabel(monthCount) : "",
            price: 0,
            description: "",
            isActive: true,
          }
    );
  }, [open, initial, section, isMonthly, reset]);

  useEffect(() => {
    if (!open || !isMonthly) return;
    if (months > 0) {
      setValue("label", monthlyPackageLabel(months));
    }
  }, [months, isMonthly, open, setValue]);

  const handleFormSubmit = async (data: SubscriptionPricingInput) => {
    if (isMonthly) {
      if (!Number.isInteger(months) || months < 1) {
        setMonthsError("Enter a valid number of months (1 or more)");
        return;
      }
      setMonthsError("");
      await onSubmit({
        ...data,
        label: monthlyPackageLabel(months),
        description: null,
      });
      return;
    }
    await onSubmit(data);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? `Edit — ${meta.title}` : meta.addLabel}
      description={meta.title}
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={handleSubmit(handleFormSubmit)}>
            {saving ? "Saving…" : initial ? "Save" : "Add"}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(handleFormSubmit)}>
        <input type="hidden" {...register("section")} />

        {isMonthly ? (
          <>
            <div className="space-y-2">
              <Label>Number of Months</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={months}
                onChange={(e) => {
                  setMonths(Number(e.target.value));
                  setMonthsError("");
                }}
                placeholder="1"
              />
              {monthsError && <p className="text-sm text-destructive">{monthsError}</p>}
              <p className="text-xs text-muted-foreground">
                Shows as: {monthlyPackageLabel(months > 0 ? months : 1)}
                {months === 12 ? " (12 months)" : ""}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                {...register("price", { valueAsNumber: true })}
                placeholder="3540"
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price.message}</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label>{meta.labelField}</Label>
              <Input {...register("label")} placeholder={meta.labelPlaceholder} />
              {errors.label && (
                <p className="text-sm text-destructive">{errors.label.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                {...register("price", { valueAsNumber: true })}
                placeholder="3540"
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea {...register("description")} rows={2} />
            </div>
          </>
        )}

        {initial && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setValue("isActive", e.target.checked)}
            />
            Active on price list
          </label>
        )}
      </form>
    </Modal>
  );
}
