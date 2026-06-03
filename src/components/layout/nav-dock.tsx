"use client";

import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { getDockNavItems, getActiveNavHref } from "./nav-config";

interface NavDockProps {
  role: Role;
}

export function NavDock({ role }: NavDockProps) {
  const pathname = usePathname();
  const items = getDockNavItems(role);
  const activeHref = getActiveNavHref(pathname, items);

  return (
    <nav
      className={cn(
        "mt-2 hidden flex-wrap items-center justify-center gap-2 lg:flex",
        "bg-transparent p-0"
      )}
      aria-label="Main navigation"
    >
      {items.map((item) => {
        const isActive = item.href === activeHref;
        const Icon = item.icon;
        return (
          <PrefetchLink
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-100",
              isActive ? "nav-pill-active" : "bg-transparent text-foreground/75 hover:bg-primary/10 hover:text-primary"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </PrefetchLink>
        );
      })}
    </nav>
  );
}
