import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import {
  accountDisabledResponse,
  ACCOUNT_DISABLED_MESSAGE,
  unauthorizedResponse,
} from "@/lib/auth/guards";
import { getAccountStatus } from "@/lib/auth/session";
import { supportsSessionVersion } from "@/lib/user-queries";

/**
 * Lightweight session watchdog for client polling (Node runtime, no Edge Prisma in middleware).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse("Unauthorized or session expired");
  }

  const status = await getAccountStatus(session.user.id);
  if (!status.active || status.disabled) {
    return accountDisabledResponse();
  }

  if (await supportsSessionVersion()) {
    const jwtVersion = session.user.sessionVersion ?? 0;
    if (jwtVersion !== status.sessionVersion) {
      return unauthorizedResponse("Unauthorized or session expired");
    }
  }

  return NextResponse.json({
    active: true,
    sessionVersion: status.sessionVersion,
    message: null,
  });
}

export { ACCOUNT_DISABLED_MESSAGE };
