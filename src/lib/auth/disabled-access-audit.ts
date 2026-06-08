import { AUDIT_ACTIONS, logAuditEvent } from "@/lib/audit-log";
import { getAuthRequestMeta } from "@/lib/auth/request-meta";

export type DisabledAccessSource = "login" | "session" | "api";

/** Non-blocking disabled-user access audit — never throws or blocks auth. */
export function logDisabledUserAccessAttempt(params: {
  userId?: string | null;
  username?: string | null;
  source: DisabledAccessSource;
  route?: string | null;
}) {
  void (async () => {
    const meta = await getAuthRequestMeta();
    await logAuditEvent({
      userId: params.userId ?? null,
      username: params.username ?? null,
      action: AUDIT_ACTIONS.DISABLED_USER_ACCESS_ATTEMPT,
      entityType: "AUTH",
      ipAddress: meta.ipAddress ?? null,
      details: {
        source: params.source,
        ...(params.route ? { route: params.route } : {}),
        ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
      },
    });
  })();
}
