import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { AUDIT_ACTIONS, logAuditEvent } from "@/lib/audit-log";
import {
  BackupRestoreError,
  parseBackupFile,
  restoreDatabaseFromBackup,
} from "@/lib/backup-restore";
import { rateLimitBackupRestore } from "@/lib/security/request-rate-limit";

const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAdmin();
    if (error) return error;

    const limited = rateLimitBackupRestore(request, user!.id);
    if (limited) return limited;

    const form = await request.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Backup JSON file is required" }, { status: 400 });
    }

    if (file.size > MAX_BACKUP_BYTES) {
      return NextResponse.json(
        { error: "Backup file is too large (maximum 50 MB)" },
        { status: 400 }
      );
    }

    const raw = await file.text();
    const backup = parseBackupFile(raw);
    const counts = await restoreDatabaseFromBackup(backup);

    void logAuditEvent({
      userId: user!.id,
      username: user!.username,
      action: AUDIT_ACTIONS.BACKUP_RESTORED,
      entityType: "BACKUP",
      details: {
        exportedAt: backup.exportedAt,
        schemaVersion: backup.schemaVersion,
        counts,
      },
    });

    return NextResponse.json({ success: true, counts });
  } catch (error) {
    if (error instanceof BackupRestoreError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiErrorResponse(error, "Failed to restore database backup");
  }
}
