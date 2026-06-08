import { headers } from "next/headers";

/** Request metadata for auth audit events (authorize runs inside /api/auth POST). */
export async function getAuthRequestMeta() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ipAddress =
    forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
  const userAgent = h.get("user-agent") || undefined;
  return { ipAddress, userAgent };
}

/** Pathname forwarded by middleware for API/page audit context. */
export async function getRequestPathname(): Promise<string | undefined> {
  const h = await headers();
  return h.get("x-mra-pathname") ?? undefined;
}
