"use client";

import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

const POLL_MS = 60_000;
const DISABLED_MESSAGE = "Your account has been disabled by an administrator.";

async function forceLogout(message: string) {
  try {
    await signOut({ redirect: false });
  } catch {
    /* continue to login */
  }
  const login = new URL("/login", window.location.origin);
  login.searchParams.set("error", "account_disabled");
  login.searchParams.set("message", message);
  window.location.assign(login.toString());
}

/**
 * Polls account status so disabled users are logged out within ~60s on every open tab.
 */
export function AccountStatusPoller() {
  const { data: session, status } = useSession();
  const versionRef = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    versionRef.current = session.user.sessionVersion ?? 0;

    let cancelled = false;

    const check = async () => {
      if (document.visibilityState !== "visible") return;

      try {
        const res = await fetch("/api/auth/account-status", {
          credentials: "include",
          cache: "no-store",
        });

        if (cancelled) return;

        if (res.status === 401) {
          const body = (await res.json().catch(() => null)) as {
            code?: string;
            error?: string;
          } | null;
          const msg =
            body?.code === "ACCOUNT_DISABLED"
              ? body.error ?? DISABLED_MESSAGE
              : "Your session has ended. Please sign in again.";
          await forceLogout(msg);
          return;
        }

        if (!res.ok) return;

        const data = (await res.json()) as {
          active?: boolean;
          sessionVersion?: number;
        };

        if (!data.active) {
          await forceLogout(DISABLED_MESSAGE);
          return;
        }

        const expected = versionRef.current ?? 0;
        if (
          typeof data.sessionVersion === "number" &&
          data.sessionVersion !== expected
        ) {
          await forceLogout("Your session has ended. Please sign in again.");
        }
      } catch {
        /* network blip — retry on next interval */
      }
    };

    void check();
    const timer = setInterval(() => void check(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [status, session?.user?.id, session?.user?.sessionVersion]);

  return null;
}
