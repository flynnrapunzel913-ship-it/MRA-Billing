import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { applyApiRateLimits } from "@/lib/security/request-rate-limit";

const protectedPrefixes = [
  "/dashboard",
  "/customers",
  "/invoices",
  "/stock",
  "/expenses",
  "/reports",
  "/admin",
  "/settings",
  "/profile",
];

const adminOnlyPrefixes = ["/reports", "/admin", "/settings"];

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user?.id;
  const role = req.auth?.user?.role;
  const userId = req.auth?.user?.id;
  // --- Rate limiting (login, search, PDF, revenue export) ---
  const rateLimitRequest = req as unknown as NextRequest;
  if (isApiPath(pathname)) {
    const rateLimited = applyApiRateLimits(rateLimitRequest, { userId });
    if (rateLimited) return rateLimited;
  }

  // --- Page routes (not API) ---
  // Session invalidation for disabled/deleted users: Node only (requireAuth, dashboard layout).
  if (!isApiPath(pathname)) {
    const isProtected = protectedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (isProtected && !isLoggedIn) {
      const login = new URL("/login", req.nextUrl);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }

    if (
      isLoggedIn &&
      role === Role.RECEPTIONIST &&
      adminOnlyPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
      )
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }

    if (pathname === "/login" && isLoggedIn) {
      // Dashboard layout redirects disabled users here; do not bounce back to /dashboard (S1-07).
      if (req.nextUrl.searchParams.get("error") === "session_invalid") {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-mra-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    "/api/auth/:path*",
    "/api/admin/revenue/export",
    "/api/customers",
    "/api/invoices",
    "/api/invoices/:path*",
    "/((?!_next/static|_next/image|favicon.ico|backgrounds|.*\\..*).*)",
  ],
};
