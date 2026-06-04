import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { savePendingStockBill, UploadValidationError } from "@/lib/storage/stock-bills";

/**
 * Hardened PDF upload endpoint (stock bill pending files).
 * Validates type, extension, MIME, size, magic bytes, and safe storage paths.
 */
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const form = await request.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }

    const saved = await savePendingStockBill(user!.id!, file);
    return NextResponse.json(saved);
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
