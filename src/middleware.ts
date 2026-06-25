import { edgeAuth } from "@/lib/auth/edge";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applyApiRateLimitsEdge } from "@/lib/security/request-rate-limit-edge";
import { canAccessRoute, getHomeRoute } from "@/lib/permissions";
import type { Role } from "@prisma/client";

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

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

export default edgeAuth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user?.id;
  const role = req.auth?.user?.role;
  const userId = req.auth?.user?.id;

  const rateLimitRequest = req as unknown as NextRequest;
  if (isApiPath(pathname)) {
    const rateLimited = applyApiRateLimitsEdge(rateLimitRequest, { userId });
    if (rateLimited) return rateLimited;
  }

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
      role &&
      !canAccessRoute(role as Role, pathname)
    ) {
      return NextResponse.redirect(new URL(getHomeRoute(role as Role), req.nextUrl));
    }

    if (pathname === "/login" && isLoggedIn) {
      if (req.nextUrl.searchParams.get("error") === "session_invalid") {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL(getHomeRoute((role as Role) ?? "RECEPTIONIST"), req.nextUrl));
    }
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-mra-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    // Do NOT match /api/auth/* — edgeAuth would run assertConfig on those routes
    // before the [...nextauth] handlers, causing UntrustedHost failures.
    "/api/admin/revenue/export",
    "/api/admin/backup/restore",
    "/api/customers",
    "/api/invoices",
    "/api/invoices/:path*",
    "/((?!_next/static|_next/image|favicon.ico|backgrounds|.*\\..*).*)",
  ],
};
