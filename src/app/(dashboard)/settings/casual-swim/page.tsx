"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
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
    resolver: zodResolver(casualSwimSettingsSchema) as Resolver<CasualSwimSettingsInput>,
    defaultValues: { casualSwimAdultCouponRate: 150, casualSwimChildCouponRate: 100 },
  });

  const adultRate = watch("casualSwimAdultCouponRate");
  const childRate = watch("casualSwimChildCouponRate");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/settings/casual-swim");
      const result = await readApiResponse<CasualSwimSettingsInput>(
        res,
        "Failed to load casual swim settings"
      );
      if (result.ok) {
        reset({
          casualSwimAdultCouponRate: Number(result.data.casualSwimAdultCouponRate ?? 150),
          casualSwimChildCouponRate: Number(result.data.casualSwimChildCouponRate ?? 100),
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
      casualSwimAdultCouponRate: Number(result.data.casualSwimAdultCouponRate),
      casualSwimChildCouponRate: Number(result.data.casualSwimChildCouponRate),
    });
    toast.success("Casual swim coupon rates updated");
  };

  if (loading) {
    return <PageSkeleton className="max-w-xl" />;
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Casual Swimming Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Set per-coupon rates for Above 5 Years and Below 5 Years coupon books used in Daily
          Collection.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Coupon Rates</CardTitle>
            <CardDescription>
              Physical coupons are tracked manually in Daily Collection. Revenue is calculated as
              coupons used × the rate for each book.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="casualSwimAdultCouponRate">Above 5 Years (₹)</Label>
              <Input
                id="casualSwimAdultCouponRate"
                type="number"
                min={1}
                step="1"
                {...register("casualSwimAdultCouponRate", { valueAsNumber: true })}
              />
              {errors.casualSwimAdultCouponRate && (
                <p className="text-sm text-destructive">
                  {errors.casualSwimAdultCouponRate.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Example: 20 × {formatCurrency(Number(adultRate) || 0)} ={" "}
                {formatCurrency((Number(adultRate) || 0) * 20)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="casualSwimChildCouponRate">Below 5 Years (₹)</Label>
              <Input
                id="casualSwimChildCouponRate"
                type="number"
                min={1}
                step="1"
                {...register("casualSwimChildCouponRate", { valueAsNumber: true })}
              />
              {errors.casualSwimChildCouponRate && (
                <p className="text-sm text-destructive">
                  {errors.casualSwimChildCouponRate.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Example: 15 × {formatCurrency(Number(childRate) || 0)} ={" "}
                {formatCurrency((Number(childRate) || 0) * 15)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save Configuration"}
        </Button>
      </form>
    </div>
  );
}
