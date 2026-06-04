import { logSecurityEvent } from "@/lib/security/security-log";

export type RateLimitPolicy = {
  /** Unique bucket key (include IP, user id, route, etc.) */
  key: string;
  /** Max requests allowed per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Label for logs */
  label: string;
};

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

/** Drop expired windows to bound memory in long-running processes. */
function pruneExpiredBuckets(now: number) {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > 60 * 60 * 1000) {
      buckets.delete(key);
    }
  }
}

/** In-memory fixed-window limiter (per server instance; use Redis for multi-node production). */
export function consumeRateLimit(policy: RateLimitPolicy): {
  allowed: boolean;
  retryAfterSec: number;
  remaining: number;
} {
  const now = Date.now();
  pruneExpiredBuckets(now);
  const existing = buckets.get(policy.key);

  if (!existing || now - existing.windowStart >= policy.windowMs) {
    buckets.set(policy.key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSec: 0, remaining: policy.limit - 1 };
  }

  if (existing.count >= policy.limit) {
    const retryAfterMs = policy.windowMs - (now - existing.windowStart);
    const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
    logSecurityEvent("rate_limit_exceeded", {
      label: policy.label,
      key: policy.key,
      limit: policy.limit,
      windowMs: policy.windowMs,
      retryAfterSec,
    });
    return { allowed: false, retryAfterSec, remaining: 0 };
  }

  existing.count += 1;
  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: policy.limit - existing.count,
  };
}

export function rateLimitResponse(retryAfterSec: number) {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}
