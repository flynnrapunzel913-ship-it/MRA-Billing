"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJsonCached, getCachedStale, invalidateCache } from "@/lib/client-cache";

type UseCachedFetchOptions = {
  enabled?: boolean;
  ttlMs?: number;
  /** Background refresh interval while the tab is visible (cross-session updates). */
  pollIntervalMs?: number;
  /** Refetch when the window/tab regains focus. */
  refetchOnFocus?: boolean;
};

export function useCachedFetch<T>(url: string, options?: UseCachedFetchOptions) {
  const enabled = options?.enabled ?? true;
  const ttlMs = options?.ttlMs;
  const pollIntervalMs = options?.pollIntervalMs;
  const refetchOnFocus = options?.refetchOnFocus ?? false;

  const [data, setData] = useState<T | null>(() => getCachedStale<T>(url));
  const [isLoading, setIsLoading] = useState(enabled && getCachedStale<T>(url) === null);
  const [error, setError] = useState<string | null>(null);

  const isInitialLoading = isLoading && data === null;
  const isRefreshing = isLoading && data !== null;

  const load = useCallback(
    async (force = false) => {
      if (!enabled) return;
      const hasStale = getCachedStale<T>(url) !== null;
      if (!hasStale) setIsLoading(true);

      try {
        const json = await fetchJsonCached<T>(url, { ttlMs, force });
        setData(json);
        setError(null);
      } catch {
        setError("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    },
    [url, enabled, ttlMs]
  );

  useEffect(() => {
    if (!enabled) return;
    const stale = getCachedStale<T>(url);
    setData(stale);
    setIsLoading(stale === null);
    void load(false);
  }, [url, enabled, load]);

  useEffect(() => {
    if (!enabled || !pollIntervalMs || pollIntervalMs <= 0) return;

    const tick = () => {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    };

    const id = window.setInterval(tick, pollIntervalMs);
    return () => window.clearInterval(id);
  }, [enabled, pollIntervalMs, load]);

  useEffect(() => {
    if (!enabled || !refetchOnFocus) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    };

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, refetchOnFocus, load]);

  const refetch = useCallback(() => {
    invalidateCache(url);
    return load(true);
  }, [url, load]);

  return { data, isLoading, isInitialLoading, isRefreshing, error, refetch, setData };
}
