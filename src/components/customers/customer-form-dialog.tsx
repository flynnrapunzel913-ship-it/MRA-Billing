"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerInput } from "@/lib/validations";
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

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: Partial<CustomerInput> & { id?: string };
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
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      mobile: "",
      email: "",
      address: "",
      gstNumber: "",
      status: "ACTIVE",
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || "",
        mobile: initialData.mobile || "",
        email: initialData.email || "",
        address: initialData.address || "",
        gstNumber: initialData.gstNumber || "",
        status: (initialData.status as CustomerInput["status"]) || "ACTIVE",
      });
    }
  }, [initialData, reset]);

  if (!open) return null;

  const onSubmit = async (data: CustomerInput) => {
    const url = initialData?.id ? `/api/customers/${initialData.id}` : "/api/customers";
    const method = initialData?.id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      return;
    }

    reset();
    onSuccess();
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-card p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">
          {initialData?.id ? "Edit Customer" : "Add Customer"}
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name</Label>
              <Input {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Mobile</Label>
              <Input {...register("mobile")} />
              {errors.mobile && <p className="text-sm text-destructive">{errors.mobile.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input {...register("email")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Textarea {...register("address")} />
            </div>
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input {...register("gstNumber")} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as CustomerInput["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Customer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
