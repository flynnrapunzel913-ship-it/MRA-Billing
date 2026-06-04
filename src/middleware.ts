import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { applyApiRateLimits } from "@/lib/security/request-rate-limit";
import { isAccountActive } from "@/lib/auth/session";

const protectedPrefixes = [
  "/dashboard",
  "/customers",
  "/invoices",
  "/stock",
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

  // --- Session invalidation: disabled/deleted users ---
  if (isLoggedIn && userId) {
    const token = req.auth as { revoked?: boolean } | null;
    if (token?.revoked) {
      const login = new URL("/login", req.nextUrl);
      login.searchParams.set("error", "session_invalid");
      return NextResponse.redirect(login);
    }

    // API routes: enforce active account (JWT may be stale on edge before jwt callback DB refresh).
    if (isApiPath(pathname) && !pathname.startsWith("/api/auth")) {
      const active = await isAccountActive(userId);
      if (!active) {
        return NextResponse.json(
          { error: "Unauthorized or session expired", code: "SESSION_INVALID" },
          { status: 401, headers: { "X-Session-Invalid": "1" } }
        );
      }
    }
  }

  // --- Page routes (not API) ---
  if (!isApiPath(pathname)) {
    const isProtected = protectedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (isProtected && !isLoggedIn) {
      const login = new URL("/login", req.nextUrl);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }

    if (isLoggedIn && userId) {
      const active = await isAccountActive(userId);
      if (!active) {
        const login = new URL("/login", req.nextUrl);
        login.searchParams.set("error", "session_invalid");
        return NextResponse.redirect(login);
      }
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
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
  }

  return NextResponse.next();
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
