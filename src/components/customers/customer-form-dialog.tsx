"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quickCustomerSchema, type QuickCustomerInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { readApiResponse } from "@/lib/api-error";
import { toast } from "sonner";

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: Partial<QuickCustomerInput> & { id?: string; status?: string };
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}: CustomerFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuickCustomerInput>({
    resolver: zodResolver(quickCustomerSchema),
    defaultValues: { name: "", mobile: "" },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || "",
        mobile: initialData.mobile || "",
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: QuickCustomerInput) => {
    const url = initialData?.id ? `/api/customers/${initialData.id}` : "/api/customers";
    const method = initialData?.id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        mobile: data.mobile.replace(/\D/g, ""),
        status: initialData?.status || "ACTIVE",
      }),
    });

    const result = await readApiResponse(res, "Failed to save customer");
    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    reset();
    onSuccess();
    onOpenChange(false);
    toast.success(initialData?.id ? "Customer updated" : "Customer created");
  };

  const isEdit = Boolean(initialData?.id);

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={isEdit ? "Edit Customer" : "Add Customer"}
      maxWidth="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="customer-form-dialog" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save Customer"}
          </Button>
        </>
      }
    >
      <form id="customer-form-dialog" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label>Customer Name *</Label>
          <Input {...register("name")} placeholder="Full name" className="h-11" />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Mobile Number *</Label>
          <Input {...register("mobile")} inputMode="tel" placeholder="10-digit mobile" className="h-11" />
          {errors.mobile && (
            <p className="text-sm text-destructive">{errors.mobile.message}</p>
          )}
        </div>
      </form>
    </Modal>
  );
}
