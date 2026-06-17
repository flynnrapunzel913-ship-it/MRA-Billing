"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { invalidateCache } from "@/lib/client-cache";
import { readApiResponse } from "@/lib/api-error";
import { casualSwimSettingsSchema, type CasualSwimSettingsInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";

type CounterStatus = {
  ticketCount: number;
  lastNumber: number;
  canReset: boolean;
};

export default function CasualSwimConfigurationPage() {
  const { data, isLoading, refetch, setData } =
    useCachedFetch<CasualSwimSettingsInput>("/api/settings/casual-swim");
  const { data: counter, refetch: refetchCounter } =
    useCachedFetch<CounterStatus>("/api/admin/casual-swim/reset-counter");
  const [resetting, setResetting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CasualSwimSettingsInput>({
    resolver: zodResolver(casualSwimSettingsSchema) as Resolver<CasualSwimSettingsInput>,
    defaultValues: {
      casualSwimAdultRatePerHour: 150,
      casualSwimChildRatePerHour: 100,
      casualSwimCapRentalPrice: 150,
      casualSwimShortsRentalPrice: 200,
      casualSwimGogglesRentalPrice: 150,
    },
  });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const onSubmit = async (formData: CasualSwimSettingsInput) => {
    const res = await fetch("/api/settings/casual-swim", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const result = await readApiResponse<CasualSwimSettingsInput>(
      res,
      "Failed to save casual swim settings"
    );
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setData(result.data);
    reset(result.data);
    invalidateCache("/api/settings/casual-swim");
    invalidateCache("/api/casual-swim/config");
    void refetch();
    toast.success("Casual swim settings updated");
  };

  const resetCounter = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/admin/casual-swim/reset-counter", { method: "POST" });
      const result = await readApiResponse<{ success: boolean }>(
        res,
        "Failed to reset ticket counter"
      );
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Ticket counter reset — next ticket will be #1");
      invalidateCache("/api/admin/casual-swim/reset-counter");
      void refetchCounter();
    } finally {
      setResetting(false);
    }
  };

  if (isLoading && !data) {
    return <PageSkeleton className="max-w-2xl" />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Casual swimming rates and rental pricing for the cashier module
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Casual Swimming Configuration</CardTitle>
            <CardDescription>
              Changes apply to new tickets only. Existing tickets keep their stored rates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-semibold text-foreground">Swimming Rates</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Above 5 Years Rate Per Hour (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    {...register("casualSwimAdultRatePerHour", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Below 5 Years Rate Per Hour (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    {...register("casualSwimChildRatePerHour", { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-foreground">Rental Rates</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Swimming Cap Rental Price (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    {...register("casualSwimCapRentalPrice", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Swimming Shorts Rental Price (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    {...register("casualSwimShortsRentalPrice", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Swimming Goggles Rental Price (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    {...register("casualSwimGogglesRentalPrice", { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save Settings"}
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Test Ticket Counter</CardTitle>
          <CardDescription>
            Reset numbering only when no tickets exist in the system. Deleted ticket numbers are
            never reused.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Current counter: <strong>{counter?.lastNumber ?? 0}</strong> · Tickets in system:{" "}
            <strong>{counter?.ticketCount ?? 0}</strong>
          </p>
          {!counter?.canReset && (counter?.ticketCount ?? 0) > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Delete all tickets before resetting counter.
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={!counter?.canReset || resetting}
            onClick={resetCounter}
          >
            {resetting ? "Resetting…" : "Reset Test Ticket Counter"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
