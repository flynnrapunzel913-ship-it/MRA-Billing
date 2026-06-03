"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJsonCached, getCachedStale, invalidateCache } from "@/lib/client-cache";

type UseCachedFetchOptions = {
  enabled?: boolean;
  ttlMs?: number;
};

export function useCachedFetch<T>(url: string, options?: UseCachedFetchOptions) {
  const enabled = options?.enabled ?? true;
  const ttlMs = options?.ttlMs;

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

  const refetch = useCallback(() => {
    invalidateCache(url);
    return load(true);
  }, [url, load]);

  return { data, isLoading, isInitialLoading, isRefreshing, error, refetch, setData };
}
