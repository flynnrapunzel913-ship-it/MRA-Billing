import { cache } from "react";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { ACCOUNT_DISABLED_MESSAGE } from "@/lib/auth/guards";
import { isAccountActive } from "@/lib/auth/session";
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
  const active = await isAccountActive(session.user.id);
  if (!active) {
    redirect(
      `/login?error=account_disabled&message=${encodeURIComponent(ACCOUNT_DISABLED_MESSAGE)}`
    );
  }

  if (session.user.role === Role.ADMIN) {
    return <AdminDashboardShell user={session.user}>{children}</AdminDashboardShell>;
  }

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
