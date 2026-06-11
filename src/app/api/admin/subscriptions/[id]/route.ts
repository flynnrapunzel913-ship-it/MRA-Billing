import { NextResponse } from "next/server";

/** Legacy route — use subscription-plans APIs. */
export async function PATCH() {
  return NextResponse.json(
    { error: "Use PATCH /api/admin/subscription-plans/[id]" },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Use DELETE /api/admin/subscription-plans/[id]" },
    { status: 410 }
  );
}
