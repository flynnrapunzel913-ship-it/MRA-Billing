"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Download, Loader2, Upload } from "lucide-react";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { invalidateCache } from "@/lib/client-cache";
import { readApiResponse } from "@/lib/api-error";
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
import { Modal } from "@/components/ui/modal";

function parseTermsPreview(text?: string) {
  return (text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function filenameFromContentDisposition(header: string | null) {
  if (!header) return null;
  const match = header.match(/filename="([^"]+)"/);
  return match?.[1] ?? null;
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const { data: settings, isLoading: loading, refetch, setData } =
    useCachedFetch<SettingsInput>("/api/settings");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      academyName: "MR Academy",
      address: "",
      phonePrimary: "",
      email: "",
      gstNumber: "",
      gstEnabled: true,
      defaultCgstRate: 9,
      defaultSgstRate: 9,
      logoUrl: "/branding/logo.png",
      footerImageUrl: "/branding/footer-curves.jpeg",
      headerImageUrl: "/branding/address-panel.jpeg",
      brandColor: "#0070C0",
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
      phoneSecondary: settings.phoneSecondary ?? "",
      website: settings.website ?? "",
      signatureUrl: settings.signatureUrl ?? "",
      bankName: settings.bankName ?? "",
      bankAccount: settings.bankAccount ?? "",
      bankIfsc: settings.bankIfsc ?? "",
      bankBranch: settings.bankBranch ?? "",
      upiId: settings.upiId ?? "",
      upiQrCode: settings.upiQrCode ?? "",
      headerImageUrl: settings.headerImageUrl ?? "/branding/address-panel.jpeg",
    });
  }, [settings, reset]);

  const onSubmit = async (data: SettingsInput) => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await readApiResponse<SettingsInput>(res, "Failed to save settings");
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setData(result.data);
    reset({
      ...result.data,
      gstEnabled: result.data.gstEnabled ?? true,
      defaultCgstRate: Number(result.data.defaultCgstRate ?? 9),
      defaultSgstRate: Number(result.data.defaultSgstRate ?? 9),
      phoneSecondary: result.data.phoneSecondary ?? "",
      website: result.data.website ?? "",
      signatureUrl: result.data.signatureUrl ?? "",
      bankName: result.data.bankName ?? "",
      bankAccount: result.data.bankAccount ?? "",
      bankIfsc: result.data.bankIfsc ?? "",
      bankBranch: result.data.bankBranch ?? "",
      upiId: result.data.upiId ?? "",
      upiQrCode: result.data.upiQrCode ?? "",
      headerImageUrl: result.data.headerImageUrl ?? "/branding/address-panel.jpeg",
    });
    invalidateCache("/api/settings");
    void refetch();
    toast.success("Settings updated");
  };

  const onInvalid = (fieldErrors: typeof errors) => {
    const firstError = Object.values(fieldErrors)[0];
    toast.error(
      firstError?.message?.toString() ?? "Please fix the highlighted fields before saving"
    );
  };

  const downloadDatabaseBackup = async () => {
    setDownloadingBackup(true);
    try {
      const res = await fetch("/api/admin/backup/export");
      if (!res.ok) {
        const result = await readApiResponse<unknown>(res, "Failed to download database backup");
        toast.error(result.ok ? "Failed to download database backup" : result.message);
        return;
      }

      const blob = await res.blob();
      const filename =
        filenameFromContentDisposition(res.headers.get("Content-Disposition")) ??
        "mra-backup.json";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Database backup downloaded");
    } catch {
      toast.error("Failed to download database backup");
    } finally {
      setDownloadingBackup(false);
    }
  };

  const onBackupFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setBackupFile(file);
  };

  const restoreDatabaseBackup = async () => {
    if (!backupFile) {
      toast.error("Select a backup JSON file first");
      return;
    }

    setRestoringBackup(true);
    try {
      const form = new FormData();
      form.append("file", backupFile);
      const res = await fetch("/api/admin/backup/restore", {
        method: "POST",
        body: form,
      });
      const result = await readApiResponse<{ success: boolean }>(
        res,
        "Failed to restore database backup"
      );
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setRestoreModalOpen(false);
      setBackupFile(null);
      if (backupFileInputRef.current) {
        backupFileInputRef.current.value = "";
      }
      // Full DB replace — clear all client API caches (stock, invoices, customers, dashboard, etc.).
      invalidateCache();
      router.refresh();
      toast.success("Database restored successfully");
    } catch {
      toast.error("Failed to restore database backup");
    } finally {
      setRestoringBackup(false);
    }
  };

  if (loading && !settings) {
    return <PageSkeleton className="max-w-3xl" />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5">
        <input type="hidden" {...register("headerImageUrl")} />
        <Card>
          <CardHeader>
            <CardTitle>Academy Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Academy Name</Label>
              <Input {...register("academyName")} />
              {errors.academyName && (
                <p className="text-sm text-destructive">{errors.academyName.message}</p>
              )}
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
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
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

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Database Backup</CardTitle>
            <CardDescription>
              Download a complete database backup for recovery purposes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              type="button"
              variant="outline"
              disabled={downloadingBackup || restoringBackup}
              onClick={downloadDatabaseBackup}
            >
              {downloadingBackup ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download Database Backup
                </>
              )}
            </Button>

            <Separator />

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Restore Database Backup</p>
                <p className="text-sm text-muted-foreground">
                  Upload an S2-17 backup JSON file to replace all current system data.
                </p>
              </div>
              <input
                ref={backupFileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={onBackupFileChange}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={downloadingBackup || restoringBackup}
                  onClick={() => backupFileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Choose Backup File
                </Button>
                {backupFile ? (
                  <span className="text-sm text-muted-foreground">{backupFile.name}</span>
                ) : null}
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!backupFile || downloadingBackup || restoringBackup}
                  onClick={() => setRestoreModalOpen(true)}
                >
                  Restore Database Backup
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Modal
        open={restoreModalOpen}
        onClose={() => {
          if (!restoringBackup) setRestoreModalOpen(false);
        }}
        title="Restore Database Backup?"
        maxWidth="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRestoreModalOpen(false)}
              disabled={restoringBackup}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={restoreDatabaseBackup}
              disabled={restoringBackup || !backupFile}
            >
              {restoringBackup ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                "Restore"
              )}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          This will completely replace all current system data with the contents of the backup
          file. This action cannot be undone.
        </p>
        {backupFile ? (
          <p className="mt-3 text-sm font-medium">{backupFile.name}</p>
        ) : null}
      </Modal>
    </div>
  );
}
