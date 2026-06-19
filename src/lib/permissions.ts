import type { Role } from "@prisma/client";

export type AppRole = Role;

export const ADMIN_ROUTES = ["/reports", "/settings", "/admin"];

export function getHomeRoute(_role: AppRole): string {
  return "/dashboard";
}

export function canAccessRoute(role: AppRole, pathname: string): boolean {
  if (role === "ADMIN") return true;

  return !ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function canAccessApi(_role: AppRole, _pathname: string): boolean {
  return true;
}

export function isAdmin(role: AppRole) {
  return role === "ADMIN";
}

/** Invoices, customers, stock, expenses, dashboard — receptionist and admin. */
export function canAccessOperationalApis(role: AppRole) {
  return role === "ADMIN" || role === "RECEPTIONIST";
}
