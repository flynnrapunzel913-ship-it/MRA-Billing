const DEFAULT_TTL_MS = 60_000;

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function getCached<T>(key: string, maxAgeMs = DEFAULT_TTL_MS): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > maxAgeMs) return null;
  return entry.data;
}

export function getCachedStale<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  return entry?.data ?? null;
}

export function setCached<T>(key: string, data: T) {
  cache.set(key, { data, fetchedAt: Date.now() });
}

export function invalidateCache(key?: string) {
  if (key) {
    cache.delete(key);
    inflight.delete(key);
    return;
  }
  cache.clear();
  inflight.clear();
}

export function invalidateCachePrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      inflight.delete(key);
    }
  }
}

export async function fetchJsonCached<T>(
  key: string,
  options?: { ttlMs?: number; force?: boolean }
): Promise<T> {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;

  if (!options?.force) {
    const fresh = getCached<T>(key, ttlMs);
    if (fresh !== null) return fresh;
  }

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const request = fetch(key, { credentials: "same-origin" }).then(async (res) => {
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }
    return res.json() as Promise<T>;
  });

  inflight.set(key, request);

  try {
    const data = await request;
    setCached(key, data);
    return data;
  } finally {
    inflight.delete(key);
  }
}

/** Warm cache on nav hover so clicks feel instant */
export function prefetchJson(key: string) {
  const fresh = getCached(key);
  if (fresh !== null || inflight.has(key)) return;
  void fetchJsonCached(key).catch(() => undefined);
}
