import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

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

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

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
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|backgrounds|.*\\..*).*)"],
};
