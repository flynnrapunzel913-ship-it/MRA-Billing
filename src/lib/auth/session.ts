import { prisma } from "@/lib/prisma";
import {
  isUserDisabled,
  supportsUserStatus,
  supportsSessionVersion,
} from "@/lib/user-queries";
import { logSecurityEvent } from "@/lib/security/security-log";
import type { Role } from "@prisma/client";

export type ActiveAccount = {
  id: string;
  username: string;
  role: Role;
  disabled: boolean;
  sessionVersion: number;
};

/**
 * Loads the user row and determines if the account may use the application.
 * Node runtime only — used by requireAuth/requireAdmin and dashboard layout (not middleware/JWT).
 */
export async function loadActiveAccount(userId: string): Promise<ActiveAccount | null> {
  if (!userId) return null;

  const withStatus = await supportsUserStatus();
  const withVersion = await supportsSessionVersion();
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      role: true,
      ...(withStatus ? { status: true } : {}),
      ...(withVersion ? { sessionVersion: true } : {}),
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
    sessionVersion: withVersion
      ? (row as { sessionVersion: number }).sessionVersion
      : 0,
  };
}

/** Lightweight poll target for client session watchdog (Node only). */
export async function getAccountStatus(userId: string) {
  const account = await loadActiveAccount(userId);
  if (!account) {
    return { active: false as const, sessionVersion: 0, disabled: true };
  }
  if (account.disabled) {
    return {
      active: false as const,
      sessionVersion: account.sessionVersion,
      disabled: true,
    };
  }
  return {
    active: true as const,
    sessionVersion: account.sessionVersion,
    disabled: false,
  };
}

export async function isAccountActive(userId: string): Promise<boolean> {
  const account = await loadActiveAccount(userId);
  return account !== null && !account.disabled;
}
