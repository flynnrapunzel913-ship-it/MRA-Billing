import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { USER_ASSIGNABLE_ROLES, USER_ROLE_OPTIONS } from "@/lib/roles";

describe("roles", () => {
  it("includes all assignable roles in dropdown options", () => {
    expect(USER_ASSIGNABLE_ROLES).toEqual([Role.RECEPTIONIST, Role.CASHIER, Role.ADMIN]);
    expect(USER_ROLE_OPTIONS.map((option) => option.value)).toEqual(USER_ASSIGNABLE_ROLES);
    expect(USER_ROLE_OPTIONS.map((option) => option.label)).toEqual([
      "Receptionist",
      "Cashier",
      "Admin",
    ]);
  });
});
