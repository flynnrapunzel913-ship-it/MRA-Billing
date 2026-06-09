"use client";

import { useEffect } from "react";
import { Role } from "@prisma/client";
import { prefetchJson } from "@/lib/client-cache";
import { prefetchAppRoutes } from "@/lib/nav-prefetch";
import { AcademyLogo } from "@/components/branding/academy-logo";
import { FloatingHeader } from "./floating-header";
import { NavDock } from "./nav-dock";
import { MobileTabBar } from "./mobile-tab-bar";

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
    prefetchJson("/api/profile");
    if (user.role === "ADMIN") {
      prefetchJson("/api/stock/summary");
      prefetchJson("/api/settings");
    }
  }, [user.role]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="dashboard-top-chrome w-full px-4 sm:px-6 lg:px-8">
        <div className="grid w-full grid-cols-[auto_1fr] items-stretch gap-x-3 sm:gap-x-4">
          <div className="row-span-2 flex items-center self-stretch py-2">
            <AcademyLogo className="h-12 w-auto sm:h-14 lg:h-16" />
          </div>
          <FloatingHeader role={user.role} />
          <NavDock role={user.role} />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col items-center px-3 sm:px-4">
        <main className="w-full max-w-6xl flex-1 pb-24 pt-3 lg:pb-8 lg:pt-4">{children}</main>
      </div>
      <MobileTabBar role={user.role} />
    </div>
  );
}
