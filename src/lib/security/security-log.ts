/**
 * Central security event logging (stdout). Wire to SIEM in production if needed.
 */
export type SecurityEvent =
  | "rate_limit_exceeded"
  | "session_revoked_disabled"
  | "session_revoked_missing_user"
  | "admin_forbidden";

export function logSecurityEvent(
  event: SecurityEvent,
  details: Record<string, string | number | boolean | undefined>
) {
  console.warn("[security]", JSON.stringify({ event, at: new Date().toISOString(), ...details }));
}
