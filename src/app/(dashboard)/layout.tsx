import { cache } from "react";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { ACCOUNT_DISABLED_MESSAGE } from "@/lib/auth/guards";
import { logDisabledUserAccessAttempt } from "@/lib/auth/disabled-access-audit";
import { getRequestPathname } from "@/lib/auth/request-meta";
import { loadActiveAccount } from "@/lib/auth/session";
import { AdminDashboardShell } from "@/components/layout/admin-dashboard-shell";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const getSession = cache(async () => auth());

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const account = await loadActiveAccount(session.user.id);
  if (!account || account.disabled) {
    if (account?.disabled) {
      const route = await getRequestPathname();
      logDisabledUserAccessAttempt({
        userId: account.id,
        username: account.username,
        source: "session",
        route: route ?? undefined,
      });
    }
    redirect(
      `/login?error=account_disabled&message=${encodeURIComponent(ACCOUNT_DISABLED_MESSAGE)}`
    );
  }

  if (session.user.role === Role.ADMIN) {
    return <AdminDashboardShell>{children}</AdminDashboardShell>;
  }

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
