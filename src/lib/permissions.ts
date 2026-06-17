export type AppRole = "ADMIN" | "RECEPTIONIST";

export const ADMIN_ROUTES = ["/reports", "/settings", "/admin"];

export function canAccessRoute(role: AppRole, pathname: string) {
  if (role === "ADMIN") return true;
  return !ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function isAdmin(role: AppRole) {
  return role === "ADMIN";
}
