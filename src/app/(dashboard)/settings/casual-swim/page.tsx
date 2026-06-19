"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { readApiResponse } from "@/lib/api-error";
import { casualSwimSettingsSchema, type CasualSwimSettingsInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { formatCurrency } from "@/lib/utils";

export default function CasualSwimSettingsPage() {
  const [loading, setLoading] = useState(true);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<CasualSwimSettingsInput>({
    resolver: zodResolver(casualSwimSettingsSchema),
    defaultValues: { casualSwimCouponRate: 150 },
  });

  const couponRate = watch("casualSwimCouponRate");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/settings/casual-swim");
      const result = await readApiResponse<CasualSwimSettingsInput>(
        res,
        "Failed to load casual swim settings"
      );
      if (result.ok) {
        reset({
          casualSwimCouponRate: Number(result.data.casualSwimCouponRate ?? 150),
        });
      }
      setLoading(false);
    })();
  }, [reset]);

  const onSubmit = async (data: CasualSwimSettingsInput) => {
    const res = await fetch("/api/settings/casual-swim", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await readApiResponse<CasualSwimSettingsInput>(
      res,
      "Failed to save casual swim settings"
    );
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    reset({
      casualSwimCouponRate: Number(result.data.casualSwimCouponRate),
    });
    toast.success("Casual swim coupon rate updated");
  };

  if (loading) {
    return <PageSkeleton className="max-w-xl" />;
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Casual Swimming Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Set the per-coupon rate used in Daily Collection coupon tracking.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Coupon Rate</CardTitle>
            <CardDescription>
              Physical coupons are tracked manually in Daily Collection. Revenue is calculated as
              coupons used × this rate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="casualSwimCouponRate">Casual Swim Coupon Rate (₹)</Label>
              <Input
                id="casualSwimCouponRate"
                type="number"
                min={1}
                step="1"
                {...register("casualSwimCouponRate", { valueAsNumber: true })}
              />
              {errors.casualSwimCouponRate && (
                <p className="text-sm text-destructive">{errors.casualSwimCouponRate.message}</p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Example: 20 coupons × {formatCurrency(Number(couponRate) || 0)} ={" "}
              {formatCurrency((Number(couponRate) || 0) * 20)}
            </p>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save Configuration"}
        </Button>
      </form>
    </div>
  );
}
