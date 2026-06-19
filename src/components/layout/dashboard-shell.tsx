"use client";

import { useEffect } from "react";
import { Role } from "@prisma/client";
import { prefetchJson } from "@/lib/client-cache";
import { prefetchAppRoutes } from "@/lib/nav-prefetch";
import { AcademyLogo } from "@/components/branding/academy-logo";
import { FloatingHeaderTitle } from "./floating-header";
import { NavDock } from "./nav-dock";
import { MobileTabBar } from "./mobile-tab-bar";
import { SessionControlPill } from "./session-control-pill";

interface DashboardShellProps {
  user: { name?: string | null; role: Role };
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  useEffect(() => {
    prefetchAppRoutes(user.role);
    prefetchJson("/api/dashboard");
    prefetchJson("/api/customers?q=");
    prefetchJson("/api/invoices");
    prefetchJson("/api/stock");
    prefetchJson("/api/expenses");
    prefetchJson("/api/profile");
    if (user.role === "ADMIN") {
      prefetchJson("/api/stock/summary");
      prefetchJson("/api/settings");
    }
  }, [user.role]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="dashboard-top-chrome w-full px-6" role="banner">
        <div className="relative w-full min-h-[4.75rem] sm:min-h-[5.25rem] lg:min-h-[5.5rem]">
          <div className="absolute left-0 top-1/2 z-10 flex -translate-y-1/2 items-center">
            <AcademyLogo className="h-14 w-auto sm:h-16 lg:h-[4.25rem]" />
          </div>

          <div className="absolute right-0 top-1/2 z-10 flex -translate-y-1/2 items-center">
            <SessionControlPill role={user.role} />
          </div>

          <div className="absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center">
            <FloatingHeaderTitle />
            <NavDock role={user.role} />
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col items-center px-3 sm:px-4">
        <main className="w-full max-w-6xl flex-1 pb-24 pt-2 lg:pb-8 lg:pt-3">{children}</main>
      </div>
      <MobileTabBar role={user.role} />
    </div>
  );
}
