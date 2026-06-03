"use client";

import { useEffect, useState } from "react";
import { Type } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useUiPreferences } from "@/components/providers/ui-preferences-provider";
import {
  UI_FONT_FAMILY_OPTIONS,
  UI_FONT_SIZE_OPTIONS,
  type UiFontFamily,
  type UiFontSize,
} from "@/lib/ui-preferences";
import { invalidateCache } from "@/lib/client-cache";

export function AppearanceSettings() {
  const { preferences, applyPreferences } = useUiPreferences();
  const [fontFamily, setFontFamily] = useState<UiFontFamily>(preferences.uiFontFamily);
  const [fontSize, setFontSize] = useState<UiFontSize>(preferences.uiFontSize);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFontFamily(preferences.uiFontFamily);
    setFontSize(preferences.uiFontSize);
  }, [preferences]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uiFontFamily: fontFamily,
          uiFontSize: fontSize,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Failed to save preferences");
        return;
      }
      applyPreferences({
        uiFontFamily: fontFamily,
        uiFontSize: fontSize,
      });
      invalidateCache("/api/profile");
      toast.success("Appearance saved to your profile");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    fontFamily !== preferences.uiFontFamily || fontSize !== preferences.uiFontSize;

  return (
    <Card className="glass-panel overflow-hidden">
      <CardHeader className="border-b border-border/60">
        <div className="flex items-center gap-2">
          <Type className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Appearance</CardTitle>
        </div>
        <CardDescription>
          Choose how text looks across the app. Saved to your profile on this device account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Font family</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {UI_FONT_FAMILY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setFontFamily(opt.value);
                  applyPreferences({ uiFontFamily: opt.value, uiFontSize: fontSize });
                }}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition-all duration-100",
                  fontFamily === opt.value
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border bg-card/50 hover:border-primary/40 hover:bg-primary/5"
                )}
              >
                <p className="font-semibold text-foreground">{opt.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Font size</Label>
          <div className="flex flex-wrap gap-2">
            {UI_FONT_SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setFontSize(opt.value);
                  applyPreferences({ uiFontFamily: fontFamily, uiFontSize: opt.value });
                }}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-100",
                  fontSize === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground/80 hover:border-primary/40"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {UI_FONT_SIZE_OPTIONS.find((o) => o.value === fontSize)?.description}
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Preview</p>
          <p className="mt-2 text-lg font-semibold">MR Academy Billing</p>
          <p className="mt-1 text-muted-foreground">
            Invoice #INV-2026-0042 · ₹12,500.00 · Customer: Sample Name
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="btn-aqua-cta"
            disabled={saving || !dirty}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save to profile"}
          </Button>
          {dirty ? (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setFontFamily(preferences.uiFontFamily);
                setFontSize(preferences.uiFontSize);
                applyPreferences(preferences);
              }}
            >
              Reset
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
