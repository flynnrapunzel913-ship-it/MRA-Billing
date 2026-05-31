import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  Settings,
  Waves,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Role } from "@prisma/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "RECEPTIONIST"] },
  { href: "/customers", label: "Customers", icon: Users, roles: ["ADMIN", "RECEPTIONIST"] },
  { href: "/invoices", label: "Invoices", icon: FileText, roles: ["ADMIN", "RECEPTIONIST"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["ADMIN"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN"] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/30 bg-card/90 backdrop-blur-md lg:block dark:border-white/10">
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Waves className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">MR Academy</p>
          <p className="text-xs text-muted-foreground">Billing System</p>
        </div>
      </div>
      <nav className="space-y-1 p-4">
        {navItems
          .filter((item) => item.roles.includes(role))
          .map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
