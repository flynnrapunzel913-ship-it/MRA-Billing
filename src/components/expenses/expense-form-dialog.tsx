"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseSchema, type ExpenseInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { readApiResponse } from "@/lib/api-error";
import { formatDateInput, cn } from "@/lib/utils";
import { EXPENSE_PAYMENT_MODES, expensePaymentModeLabel } from "@/lib/expenses/payment-mode";
import { toast } from "sonner";

export type ExpenseFormInitialData = Partial<ExpenseInput> & { id?: string };

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onDelete?: () => void;
  initialData?: ExpenseFormInitialData;
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  onSuccess,
  onDelete,
  initialData,
}: ExpenseFormDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expenseDate: formatDateInput(new Date()),
      paidTo: "",
      reason: "",
      amount: 0,
      paymentMode: "CASH",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        expenseDate: initialData?.expenseDate
          ? formatDateInput(initialData.expenseDate)
          : formatDateInput(new Date()),
        paidTo: initialData?.paidTo ?? "",
        reason: initialData?.reason ?? "",
        amount: initialData?.amount ?? 0,
        paymentMode: initialData?.paymentMode ?? "CASH",
      });
    }
  }, [initialData, open, reset]);

  const onSubmit = async (data: ExpenseInput) => {
    const url = initialData?.id ? `/api/expenses/${initialData.id}` : "/api/expenses";
    const method = initialData?.id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await readApiResponse(res, "Failed to save expense");
    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    onSuccess();
    onOpenChange(false);
    toast.success(initialData?.id ? "Expense updated" : "Expense created");
  };

  const isEdit = Boolean(initialData?.id);

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={isEdit ? "Edit Expense" : "Add Expense"}
      maxWidth="lg"
      footer={
        <>
          {isEdit && onDelete ? (
            <Button type="button" variant="destructive" onClick={onDelete} className="mr-auto">
              Delete
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="expense-form-dialog" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Add Expense"}
          </Button>
        </>
      }
    >
      <form id="expense-form-dialog" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label>Expense Date *</Label>
          <Input type="date" {...register("expenseDate")} className="h-11" />
          {errors.expenseDate && (
            <p className="text-sm text-destructive">{errors.expenseDate.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Paid To *</Label>
          <Input {...register("paidTo")} placeholder="Person or vendor name" className="h-11" />
          {errors.paidTo && <p className="text-sm text-destructive">{errors.paidTo.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Reason *</Label>
          <Input {...register("reason")} placeholder="Why this expense was made" className="h-11" />
          {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Payment Mode *</Label>
          <Controller
            name="paymentMode"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-6">
                {EXPENSE_PAYMENT_MODES.map((mode) => (
                  <label
                    key={mode}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 text-sm font-medium",
                      field.value === mode ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <input
                      type="radio"
                      name={field.name}
                      value={mode}
                      checked={field.value === mode}
                      onChange={() => field.onChange(mode)}
                      onBlur={field.onBlur}
                      className="h-4 w-4 accent-primary"
                    />
                    {expensePaymentModeLabel(mode)}
                  </label>
                ))}
              </div>
            )}
          />
          {errors.paymentMode && (
            <p className="text-sm text-destructive">{errors.paymentMode.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Amount *</Label>
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="0.00"
                className="h-11"
                value={field.value === 0 ? "" : field.value}
                onChange={(e) => {
                  const next = e.target.value === "" ? 0 : Number(e.target.value);
                  field.onChange(next);
                }}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
          {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
        </div>
      </form>
    </Modal>
  );
}
