import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { canAccessApi, canAccessRoute, getHomeRoute } from "@/lib/permissions";

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

  it("restricts cashiers to casual swim and profile only", () => {
    expect(canAccessRoute(Role.CASHIER, "/casual-swim")).toBe(true);
    expect(canAccessRoute(Role.CASHIER, "/casual-swim/receipt/abc")).toBe(true);
    expect(canAccessRoute(Role.CASHIER, "/casual-swim/configuration")).toBe(false);
    expect(canAccessRoute(Role.CASHIER, "/casual-swim/history")).toBe(false);
    expect(canAccessRoute(Role.CASHIER, "/profile")).toBe(true);
    expect(canAccessRoute(Role.CASHIER, "/dashboard")).toBe(false);
    expect(canAccessRoute(Role.CASHIER, "/invoices")).toBe(false);
    expect(canAccessRoute(Role.CASHIER, "/settings")).toBe(false);
    expect(canAccessRoute(Role.CASHIER, "/admin/users")).toBe(false);
  });

  it("routes cashiers to casual swim home", () => {
    expect(getHomeRoute(Role.CASHIER)).toBe("/casual-swim");
    expect(getHomeRoute(Role.RECEPTIONIST)).toBe("/dashboard");
  });

  it("limits cashier API access", () => {
    expect(canAccessApi(Role.CASHIER, "/api/casual-swim/bills")).toBe(true);
    expect(canAccessApi(Role.CASHIER, "/api/profile")).toBe(true);
    expect(canAccessApi(Role.CASHIER, "/api/invoices")).toBe(false);
    expect(canAccessApi(Role.RECEPTIONIST, "/api/invoices")).toBe(true);
  });
});
