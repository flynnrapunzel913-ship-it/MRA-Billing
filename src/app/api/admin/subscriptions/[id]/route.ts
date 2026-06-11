import { NextResponse } from "next/server";

/** Legacy route — use subscription-categories or subscription-plans APIs. */
export async function PATCH() {
  return NextResponse.json(
    { error: "Use PATCH /api/admin/subscription-categories/[id] or subscription-plans/[id]" },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Use DELETE /api/admin/subscription-plans/[id]" },
    { status: 410 }
  );
}
