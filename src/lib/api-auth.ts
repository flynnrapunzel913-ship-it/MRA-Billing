/**
 * API auth guards — delegates to @/lib/auth/guards for session validation + RBAC.
 * Every requireAuth() call verifies the user is not DISABLED in the database.
 */
export {
  requireAuth,
  requireOperationalAccess,
  requireAdmin,
  getValidatedSessionUser as getSessionUser,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth/guards";

import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
