"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { packageGroupSchema, type PackageGroupInput } from "@/lib/validations";
import type { CatalogPackageGroup } from "@/lib/package-catalog";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PackageGroupInput) => Promise<void>;
  initial?: CatalogPackageGroup;
  saving?: boolean;
};

export function PackageGroupFormDialog({ open, onClose, onSubmit, initial, saving }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PackageGroupInput>({
    resolver: zodResolver(packageGroupSchema),
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
      title={initial ? "Edit Package Group" : "New Package Group"}
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={handleSubmit(onSubmit)}>
            {saving ? "Saving…" : initial ? "Save Group" : "Create Group"}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label>Group Name</Label>
          <Input {...register("name")} placeholder="Monthly Package (Without Coaching)" />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <Textarea {...register("description")} rows={3} placeholder="Shown below the group heading" />
        </div>
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
