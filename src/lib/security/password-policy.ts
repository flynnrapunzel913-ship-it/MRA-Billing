import bcrypt from "bcryptjs";
import { z } from "zod";

export const BCRYPT_ROUNDS = 12;
export const MIN_PASSWORD_LENGTH = 12;
export const BACKUP_RESTORE_CONFIRMATION = "RESTORE";

export const passwordPolicyMessage = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;

const FORBIDDEN_PASSWORDS = new Set([
  "admin123",
  "reception123",
  "admin@123",
  "password",
  "123456",
  "12345678",
  "password123",
]);

export const newPasswordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, passwordPolicyMessage)
  .refine((password) => !FORBIDDEN_PASSWORDS.has(password.toLowerCase()), {
    message: "This password is too common; choose a stronger password",
  });

export function assertPasswordAllowedInProduction(password: string): void {
  if (process.env.NODE_ENV !== "production") return;
  const result = newPasswordSchema.safeParse(password);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? passwordPolicyMessage);
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function hashPasswordSync(plain: string): string {
  return bcrypt.hashSync(plain, BCRYPT_ROUNDS);
}
