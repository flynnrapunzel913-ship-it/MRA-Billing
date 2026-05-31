import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user;
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
  }
  return { error: null, user };
}

export async function requireAdmin() {
  const { error, user } = await requireAuth();
  if (error) return { error, user: null };
  if (user!.role !== Role.ADMIN) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null };
  }
  return { error: null, user };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
