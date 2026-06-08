import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { AUDIT_ACTIONS, logAuditEvent } from "@/lib/audit-log";
import { generateDatabaseBackup } from "@/lib/backup-export";

function backupFilename(date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  return `mra-backup-${day}.json`;
}

export async function GET(_request: NextRequest) {
  try {
    const { error, user } = await requireAdmin();
    if (error) return error;

    const backup = await generateDatabaseBackup();

    void logAuditEvent({
      userId: user!.id,
      username: user!.username,
      action: AUDIT_ACTIONS.BACKUP_EXPORTED,
      entityType: "BACKUP",
      details: {
        exportedAt: backup.exportedAt,
        schemaVersion: backup.schemaVersion,
        counts: backup.counts,
      },
    });

    const body = JSON.stringify(backup, null, 2);

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${backupFilename()}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to export database backup");
  }
}
