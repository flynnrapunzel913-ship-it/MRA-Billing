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
        "hidden w-full flex-wrap items-center justify-center gap-1.5 pb-1 pt-0 lg:flex"
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
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-100 sm:px-3.5 sm:text-sm",
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
