import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth/config";
import { loadActiveAccount } from "@/lib/auth/session";
import { logSecurityEvent } from "@/lib/security/security-log";

export type SessionUser = {
  id: string;
  role: Role;
  username: string;
  name?: string | null;
};

/** Standard 401 when session is missing, revoked, or user disabled. */
export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json(
    { error: message, code: "SESSION_INVALID" },
    {
      status: 401,
      headers: { "X-Session-Invalid": "1" },
    }
  );
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
  if (!account || account.disabled) return null;

  return {
    id: account.id,
    role: account.role,
    username: account.username,
    name: session.user.name,
  };
}

export async function requireAuth() {
  const user = await getValidatedSessionUser();
  if (!user) {
    return { error: unauthorizedResponse("Unauthorized or session expired"), user: null };
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
    return { error: forbiddenResponse(), user: null };
  }

  return { error: null, user };
}
