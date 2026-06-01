"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Moon, Shield, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import { Role } from "@prisma/client";
import { AcademyLogo } from "@/components/branding/academy-logo";
import { cn } from "@/lib/utils";
import { roleLabel } from "./nav-config";

interface FloatingHeaderProps {
  role: Role;
}

function RoleIcon({ role }: { role: Role }) {
  if (role === "ADMIN") {
    return <Shield className="h-3.5 w-3.5 text-primary" strokeWidth={2.25} />;
  }
  return <UserRound className="h-3.5 w-3.5 text-primary" strokeWidth={2.25} />;
}

export function FloatingHeader({ role }: FloatingHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = !mounted ? true : resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 mx-auto grid h-20 min-h-20 w-full max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-2 sm:px-4 sm:h-[5.5rem] sm:min-h-[5.5rem]",
        "bg-transparent lg:mt-3 lg:px-5"
      )}
    >
      <div className="flex min-w-0 items-center justify-start">
        <AcademyLogo className="h-[4.25rem] w-auto sm:h-20 lg:h-24" />
      </div>

      <h1 className="text-center text-sm font-bold uppercase tracking-[0.2em] text-foreground sm:text-base lg:text-lg">
        Billing System
      </h1>

      <div className="flex shrink-0 items-center justify-end">
        <div
          className={cn(
            "flex items-center gap-0.5 rounded-2xl border border-border/50 p-1",
            "bg-card/55 shadow-[var(--shadow-card)] backdrop-blur-xl",
            "ring-1 ring-inset ring-white/[0.06] dark:ring-white/[0.04]"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl px-2.5 py-1.5 sm:px-3",
              "bg-muted/35"
            )}
            title={roleLabel(role)}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/12 ring-1 ring-primary/20">
              <RoleIcon role={role} />
            </span>
            <span className="hidden max-w-[5.5rem] truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/85 sm:inline lg:max-w-none">
              {roleLabel(role)}
            </span>
          </div>

          <div className="mx-0.5 hidden h-7 w-px bg-border/70 sm:block" aria-hidden />

          <button
            type="button"
            onClick={toggleTheme}
            className={cn(
              "group relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
              "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            )}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span
              className={cn(
                "absolute inset-1 rounded-lg bg-primary/0 transition-colors duration-200",
                "group-hover:bg-primary/10"
              )}
              aria-hidden
            />
            {mounted ? (
              isDark ? (
                <Sun className="relative h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
              ) : (
                <Moon className="relative h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
              )
            ) : (
              <Sun className="relative h-[1.125rem] w-[1.125rem] opacity-40" strokeWidth={2} aria-hidden />
            )}
          </button>

          <div className="mx-0.5 h-7 w-px bg-border/70" aria-hidden />

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={cn(
              "flex h-9 items-center gap-2 rounded-xl px-2.5 sm:px-3",
              "text-sm font-medium text-foreground/80 transition-all duration-200",
              "hover:bg-destructive/12 hover:text-destructive",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/35"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
