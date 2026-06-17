import type { Role } from "@prisma/client";

export type AppRole = Role;

export const ADMIN_ROUTES = ["/reports", "/settings", "/admin"];

/** Routes a CASHIER may access (pages). */
export const CASHIER_ROUTES = ["/casual-swim", "/profile"];

/** Cashier-accessible casual swim pages (not configuration or admin history). */
export function isCashierCasualSwimPath(pathname: string): boolean {
  if (pathname === "/casual-swim") return true;
  if (pathname.startsWith("/casual-swim/receipt/")) return true;
  return false;
}

/** API path prefixes allowed for CASHIER. */
export const CASHIER_API_PREFIXES = ["/api/auth", "/api/profile", "/api/casual-swim"];

export function getHomeRoute(role: AppRole): string {
  if (role === "CASHIER") return "/casual-swim";
  return "/dashboard";
}

export function canAccessRoute(role: AppRole, pathname: string): boolean {
  if (role === "ADMIN") return true;

  if (role === "CASHIER") {
    if (pathname === "/profile" || pathname.startsWith("/profile/")) return true;
    return isCashierCasualSwimPath(pathname);
  }

  return !ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function canAccessApi(role: AppRole, pathname: string): boolean {
  if (role === "ADMIN" || role === "RECEPTIONIST") return true;
  return CASHIER_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isAdmin(role: AppRole) {
  return role === "ADMIN";
}

export function isCashier(role: AppRole) {
  return role === "CASHIER";
}

export function canAccessCasualSwim(role: AppRole) {
  return role === "ADMIN" || role === "CASHIER";
}
