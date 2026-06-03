"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, TrendingUp, UserCircle } from "lucide-react";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { PrefetchLink } from "@/components/ui/prefetch-link";

type TabItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
};

const tabs: TabItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "RECEPTIONIST"] },
  { href: "/invoices", label: "Invoices", icon: FileText, roles: ["ADMIN", "RECEPTIONIST"] },
  { href: "/customers", label: "Customers", icon: Users, roles: ["ADMIN", "RECEPTIONIST"] },
  { href: "/reports/revenue", label: "Revenue", icon: TrendingUp, roles: ["ADMIN"] },
  { href: "/profile", label: "Profile", icon: UserCircle, roles: ["ADMIN", "RECEPTIONIST"] },
];

function isTabActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileTabBar({ role }: { role: Role }) {
  const pathname = usePathname();
  const visible = tabs.filter((t) => t.roles.includes(role));

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-border lg:hidden",
        "bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      )}
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1.5">
        {visible.map((tab) => {
          const active = isTabActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <PrefetchLink
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors duration-100",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
                  active && "nav-pill-active"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="truncate">{tab.label}</span>
            </PrefetchLink>
          );
        })}
      </div>
    </nav>
  );
}
