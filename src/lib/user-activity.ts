import type { Prisma } from "@prisma/client";
import { isSchemaDriftError } from "@/lib/invoice-filters";
import { hasUserActivityDelegate, isUserSchemaDriftError } from "@/lib/user-queries";

/** Local activity types — matches UserActivityType enum in schema */
export type UserActivityTypeName =
  | "LOGIN"
  | "INVOICE_CREATED"
  | "INVOICE_DELETED"
  | "CUSTOMER_CREATED"
  | "PASSWORD_RESET"
  | "USER_DISABLED"
  | "USER_ENABLED"
  | "USER_CREATED"
  | "USER_DELETED";

export async function recordUserActivity(
  db: Prisma.TransactionClient | typeof import("@/lib/prisma").prisma,
  userId: string,
  type: UserActivityTypeName,
  description: string
) {
  if (!hasUserActivityDelegate()) {
    return null;
  }

  try {
    return await (db as typeof import("@/lib/prisma").prisma).userActivity.create({
      data: { userId, type, description },
    });
  } catch (error) {
    if (isUserSchemaDriftError(error) || isSchemaDriftError(error)) {
      console.warn(
        "[recordUserActivity] UserActivity unavailable — run: npm run db:deploy && npx prisma generate"
      );
      return null;
    }
    throw error;
  }
}

export const userActivityTypeLabel: Record<UserActivityTypeName, string> = {
  LOGIN: "User Login",
  INVOICE_CREATED: "Invoice Created",
  INVOICE_DELETED: "Invoice Deleted",
  CUSTOMER_CREATED: "Customer Created",
  PASSWORD_RESET: "Password Reset",
  USER_DISABLED: "User Disabled",
  USER_ENABLED: "User Enabled",
  USER_CREATED: "User Created",
  USER_DELETED: "User Deleted",
};

export function formatLastActivity(date: Date | null | undefined): string {
  if (!date) return "—";
  const now = new Date();
  const activityDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today.getTime() - activityDay.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
