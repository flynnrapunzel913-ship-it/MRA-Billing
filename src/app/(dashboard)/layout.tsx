import { cache } from "react";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { AdminDashboardShell } from "@/components/layout/admin-dashboard-shell";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const getSession = cache(async () => auth());

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  if (session.user.role === Role.ADMIN) {
    return <AdminDashboardShell user={session.user}>{children}</AdminDashboardShell>;
  }

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
