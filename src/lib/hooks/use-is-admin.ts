"use client";

import { useSession } from "next-auth/react";

/** Admin flag from JWT session — avoids an extra /api/dashboard round-trip on list pages. */
export function useIsAdmin() {
  const { data: session, status } = useSession();
  return {
    isAdmin: session?.user?.role === "ADMIN",
    isLoading: status === "loading",
  };
}
