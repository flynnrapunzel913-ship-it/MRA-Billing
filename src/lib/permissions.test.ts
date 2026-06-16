import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { canAccessRoute } from "@/lib/permissions";

describe("canAccessRoute", () => {
  it("allows admins on all dashboard paths", () => {
    expect(canAccessRoute(Role.ADMIN, "/settings")).toBe(true);
    expect(canAccessRoute(Role.ADMIN, "/reports/revenue")).toBe(true);
    expect(canAccessRoute(Role.ADMIN, "/admin/users")).toBe(true);
  });

  it("blocks receptionists from admin-only routes", () => {
    expect(canAccessRoute(Role.RECEPTIONIST, "/settings")).toBe(false);
    expect(canAccessRoute(Role.RECEPTIONIST, "/reports")).toBe(false);
    expect(canAccessRoute(Role.RECEPTIONIST, "/reports/daily-revenue")).toBe(false);
    expect(canAccessRoute(Role.RECEPTIONIST, "/admin/users")).toBe(false);
  });

  it("allows receptionists on operational routes", () => {
    expect(canAccessRoute(Role.RECEPTIONIST, "/dashboard")).toBe(true);
    expect(canAccessRoute(Role.RECEPTIONIST, "/customers")).toBe(true);
    expect(canAccessRoute(Role.RECEPTIONIST, "/invoices/new")).toBe(true);
    expect(canAccessRoute(Role.RECEPTIONIST, "/expenses")).toBe(true);
    expect(canAccessRoute(Role.RECEPTIONIST, "/profile")).toBe(true);
  });
});
