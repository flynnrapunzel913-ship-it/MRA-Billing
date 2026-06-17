import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth/config";
import { loadActiveAccount } from "@/lib/auth/session";
import { supportsSessionVersion } from "@/lib/user-queries";
import { logAdminAccessViolation } from "@/lib/auth/admin-access-audit";
import { logDisabledUserAccessAttempt } from "@/lib/auth/disabled-access-audit";
import { getRequestPathname } from "@/lib/auth/request-meta";
import { logSecurityEvent } from "@/lib/security/security-log";
import { canAccessCasualSwim } from "@/lib/permissions";

export type SessionUser = {
  id: string;
  role: Role;
  username: string;
  name?: string | null;
};

export const ACCOUNT_DISABLED_MESSAGE =
  "Your account has been disabled by an administrator.";

/** Standard 401 when session is missing, revoked, or user disabled. */
export function unauthorizedResponse(
  message = "Unauthorized",
  code: "SESSION_INVALID" | "ACCOUNT_DISABLED" = "SESSION_INVALID"
) {
  return NextResponse.json(
    { error: message, code },
    {
      status: 401,
      headers: { "X-Session-Invalid": "1" },
    }
  );
}

export function accountDisabledResponse() {
  return unauthorizedResponse(ACCOUNT_DISABLED_MESSAGE, "ACCOUNT_DISABLED");
}

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message, code: "FORBIDDEN" }, { status: 403 });
}

/**
 * Resolves session from JWT and verifies account still exists and is not DISABLED.
 * Call on every protected API route (via requireAuth / requireAdmin).
 */
export async function getValidatedSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const account = await loadActiveAccount(session.user.id);
  if (!account) return null;
  if (account.disabled) return null;

  if (await supportsSessionVersion()) {
    const jwtVersion = session.user.sessionVersion ?? 0;
    if (jwtVersion !== account.sessionVersion) return null;
  }

  return {
    id: account.id,
    role: account.role,
    username: account.username,
    name: session.user.name,
  };
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: unauthorizedResponse("Unauthorized or session expired"), user: null };
  }

  const account = await loadActiveAccount(session.user.id);
  if (!account) {
    return { error: unauthorizedResponse("Unauthorized or session expired"), user: null };
  }
  if (account.disabled) {
    const route = await getRequestPathname();
    logDisabledUserAccessAttempt({
      userId: account.id,
      username: account.username,
      source: "api",
      route: route ?? undefined,
    });
    return { error: accountDisabledResponse(), user: null };
  }
  if (await supportsSessionVersion()) {
    const jwtVersion = session.user.sessionVersion ?? 0;
    if (jwtVersion !== account.sessionVersion) {
      return { error: unauthorizedResponse("Unauthorized or session expired"), user: null };
    }
  }

  const user: SessionUser = {
    id: account.id,
    role: account.role,
    username: account.username,
    name: session.user.name,
  };
  return { error: null, user };
}

/** Admin or cashier — casual swimming module APIs. */
export async function requireCasualSwimAccess() {
  const { error, user } = await requireAuth();
  if (error) return { error, user: null };

  if (!canAccessCasualSwim(user!.role)) {
    logAdminAccessViolation({
      userId: user!.id,
      username: user!.username,
      actualRole: user!.role,
    });
    return { error: forbiddenResponse(), user: null };
  }

  return { error: null, user };
}

/** Server-side admin gate — role from database, not JWT alone. */
export async function requireAdmin() {
  const { error, user } = await requireAuth();
  if (error) return { error, user: null };

  if (user!.role !== Role.ADMIN) {
    logSecurityEvent("admin_forbidden", {
      userId: user!.id,
      username: user!.username,
      role: user!.role,
    });
    logAdminAccessViolation({
      userId: user!.id,
      username: user!.username,
      actualRole: user!.role,
    });
    return { error: forbiddenResponse(), user: null };
  }

  return { error: null, user };
}
