"use client";

import { useEffect } from "react";
import { prefetchJson } from "@/lib/client-cache";
import { Sidebar } from "./sidebar";
import { AdminTopBar } from "./admin-top-bar";

interface AdminDashboardShellProps {
  user: { name?: string | null };
  children: React.ReactNode;
}

export function AdminDashboardShell({ user, children }: AdminDashboardShellProps) {
  useEffect(() => {
    prefetchJson("/api/dashboard");
    prefetchJson("/api/customers?q=");
    prefetchJson("/api/invoices");
    prefetchJson("/api/settings");
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="ADMIN" userName={user.name ?? "Admin"} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AdminTopBar userName={user.name ?? "Admin"} />
        <main className="w-full flex-1 px-3 py-4 sm:px-4 lg:px-6 lg:py-6">{children}</main>
      </div>
    </div>
  );
}

