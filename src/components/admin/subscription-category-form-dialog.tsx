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
  subscriptionCategorySchema,
  type SubscriptionCategoryInput,
} from "@/lib/validations";
import type { CatalogCategory } from "@/lib/subscription-catalog";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SubscriptionCategoryInput) => Promise<void>;
  initial?: CatalogCategory;
  saving?: boolean;
};

export function SubscriptionCategoryFormDialog({
  open,
  onClose,
  onSubmit,
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
  } = useForm<SubscriptionCategoryInput>({
    resolver: zodResolver(subscriptionCategorySchema),
    defaultValues: { name: "", description: "", isActive: true },
  });

  const isActive = watch("isActive");

  useEffect(() => {
    if (!open) return;
    reset(
      initial
        ? {
            name: initial.name,
            description: initial.description ?? "",
            isActive: initial.isActive,
          }
        : { name: "", description: "", isActive: true }
    );
  }, [open, initial, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit Category" : "New Subscription Category"}
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={handleSubmit(onSubmit)}>
            {saving ? "Saving…" : initial ? "Save Category" : "Create Category"}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label>Category Name</Label>
          <Input {...register("name")} placeholder="Monthly Package (Without Coaching)" />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea {...register("description")} rows={3} />
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
