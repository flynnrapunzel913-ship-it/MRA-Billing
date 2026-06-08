import { AUDIT_ACTIONS, logAuditEvent } from "@/lib/audit-log";
import { getAuthRequestMeta } from "@/lib/auth/request-meta";

export type LoginFailureReason =
  | "invalid_input"
  | "user_not_found"
  | "account_disabled"
  | "invalid_password";

export function usernameFromCredentials(credentials: unknown): string | null {
  if (!credentials || typeof credentials !== "object") return null;
  const raw = (credentials as { username?: unknown }).username;
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  return normalized || null;
}

/** Non-blocking failed-login audit — never throws. */
export function logLoginFailed(params: {
  reason: LoginFailureReason;
  username?: string | null;
  userId?: string | null;
}) {
  void (async () => {
    const meta = await getAuthRequestMeta();
    await logAuditEvent({
      userId: params.userId ?? null,
      username: params.username ?? null,
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      entityType: "AUTH",
      details: {
        reason: params.reason,
        ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
      },
      ipAddress: meta.ipAddress ?? null,
    });
  })();
}
