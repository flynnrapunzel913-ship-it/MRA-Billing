"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getActiveNavHref, type NavItem } from "./nav-config";

export function SidebarNavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? cn(
              "border border-[#0EA5E9]/25 bg-[#0EA5E9]/10 text-[#0284C7]",
              "shadow-[0_4px_16px_rgba(14,165,233,0.15)]",
              "dark:border-transparent dark:bg-[#0EA5E9]/15 dark:text-white dark:shadow-[0_0_20px_rgba(56,189,248,0.25)]"
            )
          : cn(
              "text-slate-600 hover:bg-[#F1F5F9] hover:text-[#0284C7]",
              "dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-200"
            )
      )}
    >
      {active && (
        <span
          className={cn(
            "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#0EA5E9]",
            "shadow-[0_0_8px_rgba(14,165,233,0.5)]",
            "dark:bg-[#38BDF8] dark:shadow-[0_0_12px_rgba(56,189,248,0.8)]"
          )}
          aria-hidden
        />
      )}
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
          active
            ? "bg-[#0EA5E9]/15 text-[#0284C7] dark:bg-[#0EA5E9]/20 dark:text-[#38BDF8]"
            : cn(
                "bg-[#F1F5F9] text-slate-500",
                "group-hover:scale-105 group-hover:bg-[#E0F2FE] group-hover:text-[#0EA5E9]",
                "dark:bg-white/[0.04] dark:text-slate-400 dark:opacity-70",
                "dark:group-hover:bg-white/[0.08] dark:group-hover:text-[#38BDF8] dark:group-hover:opacity-100"
              )
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={active ? 2.25 : 2} />
      </span>
      <span className={cn(active && "font-semibold tracking-tight")}>{item.label}</span>
    </Link>
  );
}

export function SidebarNavGroups({
  groups,
  onNavigate,
}: {
  groups: ReturnType<typeof import("./nav-config").getNavGroupsForRole>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const allItems = groups.flatMap((group) => group.items);
  const activeHref = getActiveNavHref(pathname, allItems);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <SidebarNavLink
                key={item.href}
                item={item}
                active={item.href === activeHref}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
