import { NextResponse } from "next/server";

/** Legacy route — use subscription-pricing APIs. */
export async function PATCH() {
  return NextResponse.json(
    { error: "Use PATCH /api/admin/subscription-pricing/[id]" },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Use DELETE /api/admin/subscription-pricing/[id]" },
    { status: 410 }
  );
}
