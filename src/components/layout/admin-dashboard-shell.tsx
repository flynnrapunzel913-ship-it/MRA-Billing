"use client";

import { useEffect } from "react";
import { prefetchJson } from "@/lib/client-cache";
import { Sidebar } from "./sidebar";
import { SessionControlPill } from "./session-control-pill";

interface AdminDashboardShellProps {
  user: { name?: string | null };
  children: React.ReactNode;
}

export function AdminDashboardShell({ user, children }: AdminDashboardShellProps) {
  useEffect(() => {
    prefetchJson("/api/dashboard");
    prefetchJson("/api/customers?q=");
    prefetchJson("/api/invoices");
    prefetchJson("/api/stock/summary");
    prefetchJson("/api/settings");
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar role="ADMIN" userName={user.name ?? "Admin"} />
      <div className="relative flex min-h-screen min-w-0 flex-1 flex-col">
        <main className="w-full flex-1 px-3 py-4 sm:px-4 lg:px-6 lg:py-6">
          <div className="mb-4 flex justify-end lg:mb-5">
            <SessionControlPill role="ADMIN" />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

