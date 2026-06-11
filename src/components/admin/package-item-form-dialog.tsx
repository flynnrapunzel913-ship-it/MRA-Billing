"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { packageItemSchema, type PackageItemInput } from "@/lib/validations";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PackageItemInput) => Promise<void>;
  groupId: string;
  groupName: string;
  initial?: {
    id: string;
    groupId: string;
    title: string;
    price: number;
    description: string | null;
    isActive: boolean;
  };
  saving?: boolean;
};

export function PackageItemFormDialog({
  open,
  onClose,
  onSubmit,
  groupId,
  groupName,
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
  } = useForm<PackageItemInput>({
    resolver: zodResolver(packageItemSchema),
    defaultValues: {
      groupId,
      title: "",
      price: 0,
      description: "",
      isActive: true,
    },
  });

  const isActive = watch("isActive");

  useEffect(() => {
    if (!open) return;
    reset(
      initial
        ? {
            groupId: initial.groupId,
            title: initial.title,
            price: initial.price,
            description: initial.description ?? "",
            isActive: initial.isActive,
          }
        : { groupId, title: "", price: 0, description: "", isActive: true }
    );
  }, [open, initial, groupId, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit Package Item" : "Add Package Item"}
      description={groupName}
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={handleSubmit(onSubmit)}>
            {saving ? "Saving…" : initial ? "Save Item" : "Add Item"}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register("groupId")} />
        <div className="space-y-2">
          <Label>Title</Label>
          <Input {...register("title")} placeholder="1 Month" />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
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
          {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <Textarea
            {...register("description")}
            rows={2}
            placeholder="Extra note shown on the price list"
          />
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
