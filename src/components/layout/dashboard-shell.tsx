"use client";

import { useEffect } from "react";
import { Role } from "@prisma/client";
import { prefetchJson } from "@/lib/client-cache";
import { prefetchAppRoutes } from "@/lib/nav-prefetch";
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
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col items-center px-3 pt-2 sm:px-4 lg:pt-0">
        <FloatingHeader role={user.role} />
        <NavDock role={user.role} />
        <main className="w-full max-w-6xl pb-24 pt-4 lg:pb-8 lg:pt-5">{children}</main>
      </div>
      <MobileTabBar role={user.role} />
    </div>
  );
}
