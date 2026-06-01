import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const getSession = cache(async () => auth());

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
