"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { ChevronDown, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getInitials, roleLabel } from "./nav-config";

interface AdminTopBarProps {
  userName: string;
}

export function AdminTopBar({ userName }: AdminTopBarProps) {
  const { theme, setTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const initials = getInitials(userName);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center justify-end gap-2 px-4 lg:px-6",
        "border-b border-[#E2E8F0] bg-white/85 backdrop-blur-xl",
        "dark:border-white/10 dark:bg-[#0B1730]/80"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-9 w-9 rounded-xl",
          "text-slate-600 hover:bg-[#F1F5F9] hover:text-[#0EA5E9]",
          "dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-[#38BDF8]"
        )}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>

      <div ref={profileRef} className="relative">
        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          className={cn(
            "flex items-center gap-2 rounded-2xl py-1.5 pl-1.5 pr-2.5 transition-all duration-200",
            "border border-[#E2E8F0] bg-white shadow-sm",
            "hover:border-[#0EA5E9]/30 hover:bg-[#F8FAFC]",
            "dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none",
            "dark:hover:border-[#38BDF8]/30 dark:hover:bg-white/[0.08]"
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8] text-xs font-bold text-white">
            {initials}
          </div>
          <div className="hidden text-left sm:block">
            <p className="max-w-[8rem] truncate text-xs font-semibold text-slate-900 dark:text-white">
              {userName}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{roleLabel("ADMIN")}</p>
          </div>
          <ChevronDown
            className={cn(
              "hidden h-3.5 w-3.5 text-slate-400 transition-transform sm:block",
              profileOpen && "rotate-180"
            )}
          />
        </button>

        {profileOpen && (
          <div
            className={cn(
              "absolute right-0 top-[calc(100%+8px)] z-50 min-w-[12rem] rounded-2xl p-1.5 backdrop-blur-xl",
              "border border-[#E2E8F0] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]",
              "dark:border-white/10 dark:bg-[#0B1730]/95 dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
            )}
          >
            <div className="border-b border-[#E2E8F0] px-3 py-2.5 dark:border-white/10">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{userName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{roleLabel("ADMIN")}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                "text-slate-600 hover:bg-[#F1F5F9] hover:text-slate-900",
                "dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
              )}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

