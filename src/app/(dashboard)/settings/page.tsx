"use client";

import { useEffect } from "react";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { invalidateCache } from "@/lib/client-cache";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingsSchema, type SettingsInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function parseTermsPreview(text?: string) {
  return (text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function SettingsPage() {
  const { data: settings, isLoading: loading } = useCachedFetch<SettingsInput>("/api/settings");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      gstEnabled: true,
      defaultCgstRate: 9,
      defaultSgstRate: 9,
      termsAndConditions:
        "1. Fees once paid are non-refundable.\n2. Subject to academy rules.\n3. This is a computer generated invoice.",
    },
  });

  const gstEnabled = watch("gstEnabled");
  const termsText = watch("termsAndConditions");
  const termsPreview = parseTermsPreview(termsText);

  useEffect(() => {
    if (!settings) return;
    reset({
      ...settings,
      gstEnabled: settings.gstEnabled ?? true,
      defaultCgstRate: Number(settings.defaultCgstRate ?? 9),
      defaultSgstRate: Number(settings.defaultSgstRate ?? 9),
    });
  }, [settings, reset]);

  const onSubmit = async (data: SettingsInput) => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      toast.error("Failed to save settings");
      return;
    }
    invalidateCache("/api/settings");
    toast.success("Settings updated");
  };

  if (loading && !settings) {
    return <PageSkeleton className="max-w-3xl" />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Academy Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Academy Name</Label>
              <Input {...register("academyName")} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Registered Address (internal only — not printed on invoice)</Label>
              <Textarea {...register("address")} />
            </div>
            <div className="space-y-2">
              <Label>Primary Phone</Label>
              <Input {...register("phonePrimary")} />
            </div>
            <div className="space-y-2">
              <Label>Secondary Phone</Label>
              <Input {...register("phoneSecondary")} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input {...register("email")} />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input {...register("website")} />
            </div>
            <div className="space-y-2">
              <Label>Brand Color</Label>
              <Input type="color" {...register("brandColor")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>GST Settings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={gstEnabled}
                onChange={(e) => setValue("gstEnabled", e.target.checked)}
              />
              Enable GST on invoices (uncheck to remove CGST/SGST from billing)
            </label>
            {gstEnabled && (
              <>
                <div className="space-y-2">
                  <Label>CGST %</Label>
                  <Input type="number" step="0.01" {...register("defaultCgstRate", { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>SGST %</Label>
                  <Input type="number" step="0.01" {...register("defaultSgstRate", { valueAsNumber: true })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>GST Number (shown on letterhead when GST enabled)</Label>
                  <Input {...register("gstNumber")} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Letterhead Assets</CardTitle>
            <CardDescription>Logo, footer wave, and signature used on PDF invoices</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input {...register("logoUrl")} placeholder="/branding/logo.png" />
            </div>
            <div className="space-y-2">
              <Label>Footer Image URL</Label>
              <Input {...register("footerImageUrl")} placeholder="/branding/footer-curves.jpeg" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Signature Image URL (optional)</Label>
              <Input {...register("signatureUrl")} placeholder="/branding/signature.png" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Terms & Conditions</CardTitle>
            <CardDescription>
              Shown at the bottom of every invoice PDF. Enter one term per line.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Invoice terms (one per line)</Label>
              <Textarea
                rows={8}
                className="font-mono text-sm"
                placeholder={
                  "1. Fees once paid are non-refundable.\n2. Subject to academy rules.\n3. This is a computer generated invoice."
                }
                {...register("termsAndConditions")}
              />
              <p className="text-xs text-muted-foreground">
                Tip: Start each line with a number (1., 2., …) or plain text — both work on the PDF.
              </p>
            </div>
            {termsPreview.length > 0 && (
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  PDF preview
                </p>
                <ol className="list-inside list-decimal space-y-1 text-sm text-foreground">
                  {termsPreview.map((term, i) => (
                    <li key={i}>
                      {/^\d+[\).\s]/.test(term) ? term.replace(/^\d+[\).\s]+/, "") : term}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </div>
  );
}
