"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import {
  applyUiPreferencesToDocument,
  cacheUiPreferences,
  clearCachedUiPreferences,
  DEFAULT_UI_PREFERENCES,
  normalizeUiPreferences,
  readCachedUiPreferences,
  type UiPreferences,
} from "@/lib/ui-preferences";

type UiPreferencesContextValue = {
  preferences: UiPreferences;
  loading: boolean;
  setPreferences: (next: Partial<UiPreferences>) => void;
  applyPreferences: (prefs: UiPreferences) => void;
};

const UiPreferencesContext = createContext<UiPreferencesContextValue | null>(null);

export function useUiPreferences() {
  const ctx = useContext(UiPreferencesContext);
  if (!ctx) {
    throw new Error("useUiPreferences must be used within UiPreferencesProvider");
  }
  return ctx;
}

export function UiPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { status, data: session } = useSession();
  const userId = session?.user?.id;

  const [preferences, setPreferencesState] = useState<UiPreferences>(() => {
    return readCachedUiPreferences() ?? DEFAULT_UI_PREFERENCES;
  });
  const [loading, setLoading] = useState(status === "authenticated");

  const applyPreferences = useCallback(
    (prefs: UiPreferences) => {
      setPreferencesState(prefs);
      applyUiPreferencesToDocument(prefs);
      cacheUiPreferences(prefs, userId);
    },
    [userId]
  );

  useEffect(() => {
    applyUiPreferencesToDocument(preferences);
  }, [preferences]);

  useEffect(() => {
    if (status === "unauthenticated") {
      clearCachedUiPreferences();
      setPreferencesState(DEFAULT_UI_PREFERENCES);
      applyUiPreferencesToDocument(DEFAULT_UI_PREFERENCES);
      setLoading(false);
      return;
    }

    if (status !== "authenticated" || !userId) {
      setLoading(false);
      return;
    }

    const cached = readCachedUiPreferences(userId);
    if (cached) {
      setPreferencesState(cached);
      applyUiPreferencesToDocument(cached);
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/profile", { credentials: "same-origin" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          uiFontFamily?: string;
          uiFontSize?: string;
        };
        if (cancelled) return;
        const prefs = normalizeUiPreferences(data);
        setPreferencesState(prefs);
        applyUiPreferencesToDocument(prefs);
        cacheUiPreferences(prefs, userId);
      } catch {
        /* keep cached / defaults */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  const setPreferences = useCallback(
    (next: Partial<UiPreferences>) => {
      setPreferencesState((prev) => {
        const merged = { ...prev, ...next };
        applyUiPreferencesToDocument(merged);
        cacheUiPreferences(merged, userId);
        return merged;
      });
    },
    [userId]
  );

  const value = useMemo(
    () => ({
      preferences,
      loading,
      setPreferences,
      applyPreferences,
    }),
    [preferences, loading, setPreferences, applyPreferences]
  );

  return (
    <UiPreferencesContext.Provider value={value}>{children}</UiPreferencesContext.Provider>
  );
}
