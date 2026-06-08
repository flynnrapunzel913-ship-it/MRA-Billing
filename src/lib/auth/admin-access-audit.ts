import { AUDIT_ACTIONS, logAuditEvent } from "@/lib/audit-log";
import { getAuthRequestMeta, getRequestPathname } from "@/lib/auth/request-meta";

/** Non-blocking admin-access violation audit — never throws or blocks authorization. */
export function logAdminAccessViolation(params: {
  userId: string;
  username: string;
  actualRole: string;
  route?: string | null;
}) {
  void (async () => {
    const meta = await getAuthRequestMeta();
    const route = params.route ?? (await getRequestPathname());
    await logAuditEvent({
      userId: params.userId,
      username: params.username,
      action: AUDIT_ACTIONS.ADMIN_ACCESS_VIOLATION,
      entityType: "AUTH",
      ipAddress: meta.ipAddress ?? null,
      details: {
        requiredRole: "ADMIN",
        actualRole: params.actualRole,
        ...(route ? { route } : {}),
        ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
      },
    });
  })();
}
