import { describe, expect, it } from "vitest";
import {
  BACKUP_RESTORE_CONFIRMATION,
  MIN_PASSWORD_LENGTH,
  newPasswordSchema,
} from "@/lib/security/password-policy";

describe("password-policy", () => {
  it("requires minimum length", () => {
    const result = newPasswordSchema.safeParse("short");
    expect(result.success).toBe(false);
  });

  it("rejects common default passwords", () => {
    const result = newPasswordSchema.safeParse("admin@123");
    expect(result.success).toBe(false);
  });

  it("accepts strong passwords", () => {
    const password = "a".repeat(MIN_PASSWORD_LENGTH);
    expect(newPasswordSchema.safeParse(password).success).toBe(true);
  });

  it("defines backup restore confirmation phrase", () => {
    expect(BACKUP_RESTORE_CONFIRMATION).toBe("RESTORE");
  });
});
