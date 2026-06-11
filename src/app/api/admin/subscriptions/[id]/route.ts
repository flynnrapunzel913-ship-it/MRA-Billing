import { NextResponse } from "next/server";

/** Legacy route — use package-groups or package-items APIs. */
export async function PATCH() {
  return NextResponse.json(
    { error: "Use PATCH /api/admin/package-groups/[id] or package-items/[id]" },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Use DELETE /api/admin/package-groups/[id] or package-items/[id]" },
    { status: 410 }
  );
}
