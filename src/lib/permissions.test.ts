import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import {
  canAccessApi,
  canAccessOperationalApis,
  canAccessRoute,
  getHomeRoute,
} from "@/lib/permissions";

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

  it("routes all roles to dashboard home", () => {
    expect(getHomeRoute(Role.RECEPTIONIST)).toBe("/dashboard");
    expect(getHomeRoute(Role.ADMIN)).toBe("/dashboard");
  });

  it("allows all authenticated roles API access", () => {
    expect(canAccessApi(Role.RECEPTIONIST, "/api/invoices")).toBe(true);
    expect(canAccessApi(Role.ADMIN, "/api/invoices")).toBe(true);
  });
});

describe("operational access", () => {
  it("allows receptionist and admin on operational APIs", () => {
    expect(canAccessOperationalApis(Role.RECEPTIONIST)).toBe(true);
    expect(canAccessOperationalApis(Role.ADMIN)).toBe(true);
  });
});
