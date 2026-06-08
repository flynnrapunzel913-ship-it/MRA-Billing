import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  TrendingUp,
  UserCog,
  Layers,
  Package,
  Settings,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { Role } from "@prisma/client";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ["ADMIN", "RECEPTIONIST"],
      },
      {
        href: "/invoices",
        label: "Invoices",
        icon: FileText,
        roles: ["ADMIN", "RECEPTIONIST"],
      },
      {
        href: "/customers",
        label: "Customers",
        icon: Users,
        roles: ["ADMIN", "RECEPTIONIST"],
      },
      {
        href: "/stock",
        label: "Stock Inventory",
        icon: Package,
        roles: ["ADMIN", "RECEPTIONIST"],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        href: "/reports/revenue",
        label: "Revenue",
        icon: TrendingUp,
        roles: ["ADMIN"],
      },
      {
        href: "/admin/subscriptions",
        label: "Subscription Management",
        icon: Layers,
        roles: ["ADMIN"],
      },
      {
        href: "/reports",
        label: "Reports",
        icon: BarChart3,
        roles: ["ADMIN"],
      },
      {
        href: "/admin/users",
        label: "User Management",
        icon: UserCog,
        roles: ["ADMIN"],
      },
      {
        href: "/admin/security",
        label: "Security Dashboard",
        icon: Shield,
        roles: ["ADMIN"],
      },
      {
        href: "/settings",
        label: "Academy Settings",
        icon: Settings,
        roles: ["ADMIN"],
      },
    ],
  },
];

export function getNavGroupsForRole(role: Role): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);
}

/** Flat list for horizontal nav dock (desktop). */
export function getDockNavItems(role: Role): NavItem[] {
  return getNavGroupsForRole(role).flatMap((group) => group.items);
}

/** Returns the single nav href that should be active for the current pathname. */
export function getActiveNavHref(pathname: string, items: NavItem[]): string | null {
  let best: NavItem | null = null;

  for (const item of items) {
    const matches =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (!best || item.href.length > best.href.length)) {
      best = item;
    }
  }

  return best?.href ?? null;
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function roleLabel(role: Role) {
  return role === "ADMIN" ? "Administrator" : "Receptionist";
}
