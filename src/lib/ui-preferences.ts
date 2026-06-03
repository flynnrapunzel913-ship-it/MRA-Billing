import { z } from "zod";

export const UI_FONT_FAMILIES = ["serif", "sans", "rounded", "mono"] as const;
export const UI_FONT_SIZES = ["small", "medium", "large", "xlarge"] as const;

export type UiFontFamily = (typeof UI_FONT_FAMILIES)[number];
export type UiFontSize = (typeof UI_FONT_SIZES)[number];

export const UI_PREFS_STORAGE_KEY = "mra-billing-ui-prefs";

export const uiFontFamilySchema = z.enum(UI_FONT_FAMILIES);
export const uiFontSizeSchema = z.enum(UI_FONT_SIZES);

export const uiPreferencesSchema = z.object({
  uiFontFamily: uiFontFamilySchema.optional(),
  uiFontSize: uiFontSizeSchema.optional(),
});

export type UiPreferences = {
  uiFontFamily: UiFontFamily;
  uiFontSize: UiFontSize;
};

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  uiFontFamily: "sans",
  uiFontSize: "medium",
};

export const UI_FONT_FAMILY_OPTIONS: {
  value: UiFontFamily;
  label: string;
  description: string;
}[] = [
  { value: "sans", label: "Modern Sans", description: "Inter — clean UI text (default)" },
  { value: "serif", label: "Classic Serif", description: "Source Serif — elegant, readable" },
  { value: "rounded", label: "Soft Sans", description: "DM Sans — friendly curves" },
  { value: "mono", label: "Monospace", description: "JetBrains Mono — fixed width" },
];

export const UI_FONT_SIZE_OPTIONS: {
  value: UiFontSize;
  label: string;
  description: string;
}[] = [
  { value: "small", label: "Small", description: "Compact — more on screen" },
  { value: "medium", label: "Medium", description: "Default comfortable size" },
  { value: "large", label: "Large", description: "Easier to read" },
  { value: "xlarge", label: "Extra Large", description: "Maximum readability" },
];

export function normalizeUiPreferences(input?: {
  uiFontFamily?: string | null;
  uiFontSize?: string | null;
}): UiPreferences {
  const family = uiFontFamilySchema.safeParse(input?.uiFontFamily);
  const size = uiFontSizeSchema.safeParse(input?.uiFontSize);
  return {
    uiFontFamily: family.success ? family.data : DEFAULT_UI_PREFERENCES.uiFontFamily,
    uiFontSize: size.success ? size.data : DEFAULT_UI_PREFERENCES.uiFontSize,
  };
}

export function applyUiPreferencesToDocument(prefs: UiPreferences) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-ui-font", prefs.uiFontFamily);
  root.setAttribute("data-ui-font-size", prefs.uiFontSize);
}

export type CachedUiPreferences = UiPreferences & { userId?: string };

export function cacheUiPreferences(prefs: UiPreferences, userId?: string) {
  if (typeof localStorage === "undefined") return;
  try {
    const payload: CachedUiPreferences = { ...prefs, ...(userId ? { userId } : {}) };
    localStorage.setItem(UI_PREFS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearCachedUiPreferences() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(UI_PREFS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function readCachedUiPreferences(expectedUserId?: string): UiPreferences | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(UI_PREFS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedUiPreferences;
    if (expectedUserId && parsed.userId && parsed.userId !== expectedUserId) {
      return null;
    }
    return normalizeUiPreferences(parsed);
  } catch {
    return null;
  }
}

/** Inline script for root layout — applies cached prefs before paint */
export const UI_PREFS_BOOTSTRAP_SCRIPT = `(function(){try{var d=document.documentElement,k='${UI_PREFS_STORAGE_KEY}',r=localStorage.getItem(k);if(!r){d.setAttribute('data-ui-font','sans');d.setAttribute('data-ui-font-size','medium');return;}var p=JSON.parse(r);if(p.uiFontFamily)d.setAttribute('data-ui-font',p.uiFontFamily);else d.setAttribute('data-ui-font','sans');if(p.uiFontSize)d.setAttribute('data-ui-font-size',p.uiFontSize);else d.setAttribute('data-ui-font-size','medium');}catch(e){document.documentElement.setAttribute('data-ui-font','sans');document.documentElement.setAttribute('data-ui-font-size','medium');}})();`;
