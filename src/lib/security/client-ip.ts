import type { NextRequest } from "next/server";

/** Prefer platform-set x-real-ip (e.g. Vercel). Do not trust spoofable X-Forwarded-For in production. */
export function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  if (process.env.NODE_ENV === "development") {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]?.trim() || "127.0.0.1";
    return "127.0.0.1";
  }

  return "unknown";
}
