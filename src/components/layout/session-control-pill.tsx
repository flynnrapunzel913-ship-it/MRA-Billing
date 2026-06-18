"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Moon, Shield, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { roleLabel } from "./nav-config";

const pillShellClass = cn(
  "inline-flex items-center gap-0.5 rounded-full border border-border/50 p-1",
  "bg-card/55 shadow-[var(--shadow-card)] backdrop-blur-xl",
  "ring-1 ring-inset ring-white/[0.06] dark:ring-white/[0.04]"
);

function RoleIcon({ role }: { role: Role }) {
  if (role === "ADMIN") {
    return <Shield className="h-3.5 w-3.5 text-primary" strokeWidth={2.25} />;
  }
  return <UserRound className="h-3.5 w-3.5 text-primary" strokeWidth={2.25} />;
}

function RoleBadge({ role, linkToProfile }: { role: Role; linkToProfile?: boolean }) {
  const inner = (
    <>
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/12 ring-1 ring-primary/20">
        <RoleIcon role={role} />
      </span>
      <span className="max-w-[7rem] truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/85 sm:max-w-none">
        {roleLabel(role)}
      </span>
    </>
  );

  const className = cn(
    "flex items-center gap-2 rounded-full px-2.5 py-1.5 sm:px-3",
    "bg-muted/35",
    linkToProfile && "transition-colors hover:bg-primary/10"
  );

  if (linkToProfile) {
    return (
      <PrefetchLink href="/profile" className={className} title="Your profile">
        {inner}
      </PrefetchLink>
    );
  }

  return (
    <div className={className} title={roleLabel(role)}>
      {inner}
    </div>
  );
}

/** Static shell for SSR + first client paint — no <button> so extensions cannot mismatch attrs */
function SessionControlPillPlaceholder({ role }: { role: Role }) {
  return (
    <div className={pillShellClass}>
      <RoleBadge role={role} />
      <div className="mx-0.5 h-7 w-px bg-border/70" />
      <div className="h-9 w-9 rounded-full bg-muted/30" />
      <div className="mx-0.5 h-7 w-px bg-border/70" />
      <div className="h-9 w-[4.5rem] rounded-full bg-muted/30 sm:w-[5.5rem]" />
    </div>
  );
}

function SessionControlPillControls({ role }: { role: Role }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <div className={pillShellClass}>
      <RoleBadge role={role} linkToProfile />

      <div className="mx-0.5 h-7 w-px bg-border/70" aria-hidden />

      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          "group relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200",
          "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        )}
        aria-label="Toggle color theme"
      >
        <span
          className={cn(
            "absolute inset-1 rounded-full bg-primary/0 transition-colors duration-200",
            "group-hover:bg-primary/10"
          )}
          aria-hidden
        />
        {isDark ? (
          <Sun className="relative h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
        ) : (
          <Moon className="relative h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
        )}
      </button>

      <div className="mx-0.5 h-7 w-px bg-border/70" aria-hidden />

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className={cn(
          "flex h-9 items-center gap-2 rounded-full px-2.5 sm:px-3",
          "text-sm font-medium text-foreground/80 transition-all duration-200",
          "hover:bg-destructive/12 hover:text-destructive",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/35"
        )}
      >
        <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}

export function SessionControlPill({ role }: { role: Role }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <SessionControlPillPlaceholder role={role} />;
  }

  return <SessionControlPillControls role={role} />;
}
