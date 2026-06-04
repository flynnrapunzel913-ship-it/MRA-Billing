import { prisma } from "@/lib/prisma";
import { isUserDisabled, supportsUserStatus } from "@/lib/user-queries";
import { logSecurityEvent } from "@/lib/security/security-log";
import type { Role } from "@prisma/client";

export type ActiveAccount = {
  id: string;
  username: string;
  role: Role;
  disabled: boolean;
};

/**
 * Loads the user row and determines if the account may use the application.
 * Used on every authenticated API request and when refreshing JWT/session.
 */
export async function loadActiveAccount(userId: string): Promise<ActiveAccount | null> {
  if (!userId) return null;

  const withStatus = await supportsUserStatus();
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      role: true,
      ...(withStatus ? { status: true } : {}),
    },
  });

  if (!row) {
    logSecurityEvent("session_revoked_missing_user", { userId });
    return null;
  }

  const disabled = withStatus && isUserDisabled(row as { status?: string });
  if (disabled) {
    logSecurityEvent("session_revoked_disabled", { userId, username: row.username });
  }

  return {
    id: row.id,
    username: row.username,
    role: row.role,
    disabled: !!disabled,
  };
}

export async function isAccountActive(userId: string): Promise<boolean> {
  const account = await loadActiveAccount(userId);
  return account !== null && !account.disabled;
}
