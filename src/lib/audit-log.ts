import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Canonical audit action identifiers (stored in AuditLog.action). */
export const AUDIT_ACTIONS = {
  INVOICE_CREATED: "INVOICE_CREATED",
  STOCK_CREATED: "STOCK_CREATED",
  STOCK_DELETED: "STOCK_DELETED",
  USER_ENABLED: "USER_ENABLED",
  USER_DISABLED: "USER_DISABLED",
  USER_LOGIN: "USER_LOGIN",
  LOGIN_FAILED: "LOGIN_FAILED",
  DISABLED_USER_ACCESS_ATTEMPT: "DISABLED_USER_ACCESS_ATTEMPT",
  ADMIN_ACCESS_VIOLATION: "ADMIN_ACCESS_VIOLATION",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  USER_LOGOUT: "USER_LOGOUT",
  SETTINGS_UPDATED: "SETTINGS_UPDATED",
  BACKUP_EXPORTED: "BACKUP_EXPORTED",
  BACKUP_RESTORED: "BACKUP_RESTORED",
  EXPENSE_CREATED: "EXPENSE_CREATED",
  EXPENSE_UPDATED: "EXPENSE_UPDATED",
  EXPENSE_DELETED: "EXPENSE_DELETED",
  DAILY_COLLECTION_MARKED: "DAILY_COLLECTION_MARKED",
  DAILY_COLLECTION_UPDATED: "DAILY_COLLECTION_UPDATED",
  CASUAL_SWIM_RECONCILIED: "CASUAL_SWIM_RECONCILIED",
  CASUAL_SWIM_RECONCILIATION_UPDATED: "CASUAL_SWIM_RECONCILIATION_UPDATED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/** JSON payload for AuditLog.details — must be Prisma-serializable. */
export type AuditDetails = Prisma.InputJsonValue;

export type LogAuditEventInput = {
  userId?: string | null;
  username?: string | null;
  action: AuditAction | string;
  entityType?: string | null;
  entityId?: string | null;
  details?: AuditDetails | null;
  ipAddress?: string | null;
};

/**
 * Persists one row to AuditLog. Failures are logged to stderr and never propagated.
 */
export async function logAuditEvent(input: LogAuditEventInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        username: input.username ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        details: input.details ?? undefined,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (error) {
    console.error(
      "[audit-log] Failed to write audit event:",
      error instanceof Error ? error.message : error,
      { action: input.action, entityType: input.entityType, entityId: input.entityId }
    );
  }
}
