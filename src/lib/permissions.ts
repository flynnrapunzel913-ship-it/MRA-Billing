import { Role } from "@prisma/client";

export const ADMIN_ROUTES = ["/reports", "/settings"];

export function canAccessRoute(role: Role, pathname: string) {
  if (role === Role.ADMIN) return true;
  return !ADMIN_ROUTES.some((route) => pathname.startsWith(route));
}

export function isAdmin(role: Role) {
  return role === Role.ADMIN;
}
