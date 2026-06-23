import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/security/client-ip";
import { consumeRateLimit, rateLimitResponse, type RateLimitPolicy } from "@/lib/security/rate-limit";

function applyPolicy(request: NextRequest, policy: RateLimitPolicy): Response | null {
  const result = consumeRateLimit(policy);
  if (!result.allowed) {
    return rateLimitResponse(result.retryAfterSec);
  }
  return null;
}

/** Login / credential sign-in attempts (brute-force protection). */
export function rateLimitLogin(request: NextRequest): Response | null {
  if (request.method !== "POST") return null;
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/api/auth")) return null;

  const ip = getClientIp(request);
  return applyPolicy(request, {
    key: `login:ip:${ip}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
    label: "login",
  });
}

/** GET list endpoints with search query param. */
export function rateLimitSearch(
  request: NextRequest,
  userId?: string | null
): Response | null {
  if (request.method !== "GET") return null;
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return null;

  const pathname = request.nextUrl.pathname;
  const isCustomerSearch = pathname === "/api/customers";
  const isInvoiceSearch = pathname === "/api/invoices";
  if (!isCustomerSearch && !isInvoiceSearch) return null;

  const ip = getClientIp(request);
  const actor = userId || `ip:${ip}`;
  return applyPolicy(request, {
    key: `search:${pathname}:${actor}`,
    limit: 60,
    windowMs: 60 * 1000,
    label: "search",
  });
}

/** Invoice PDF generation (expensive). */
export function rateLimitInvoicePdf(
  request: NextRequest,
  userId?: string | null
): Response | null {
  if (request.method !== "GET") return null;
  const match = request.nextUrl.pathname.match(/^\/api\/invoices\/[^/]+\/pdf$/);
  if (!match) return null;

  const ip = getClientIp(request);
  const actor = userId || `ip:${ip}`;
  return applyPolicy(request, {
    key: `pdf:${actor}`,
    limit: 30,
    windowMs: 60 * 1000,
    label: "invoice_pdf",
  });
}

/** Database backup restore (admin). */
export function rateLimitBackupRestore(
  request: NextRequest,
  userId?: string | null
): Response | null {
  if (request.method !== "POST") return null;
  if (request.nextUrl.pathname !== "/api/admin/backup/restore") return null;

  const keyUser = userId || getClientIp(request);
  return applyPolicy(request, {
    key: `backup_restore:${keyUser}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
    label: "backup_restore",
  });
}

/** Revenue CSV export (admin). */
export function rateLimitRevenueExport(
  request: NextRequest,
  userId?: string | null
): Response | null {
  if (request.method !== "GET") return null;
  if (request.nextUrl.pathname !== "/api/admin/revenue/export") return null;

  const keyUser = userId || getClientIp(request);
  return applyPolicy(request, {
    key: `revenue_export:${keyUser}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
    label: "revenue_export",
  });
}

/** Edge middleware entry — no Prisma audit logging. */
export function applyApiRateLimitsEdge(
  request: NextRequest,
  options?: { userId?: string | null }
): Response | null {
  const uid = options?.userId;
  return (
    rateLimitLogin(request) ||
    rateLimitSearch(request, uid) ||
    rateLimitInvoicePdf(request, uid) ||
    rateLimitRevenueExport(request, uid) ||
    rateLimitBackupRestore(request, uid) ||
    null
  );
}
