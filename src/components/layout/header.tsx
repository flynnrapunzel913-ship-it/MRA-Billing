"use client";



import { useEffect, useRef, useState } from "react";

import { signOut } from "next-auth/react";

import { ChevronDown, LogOut, Menu, Moon, Sun } from "lucide-react";

import { useTheme } from "next-themes";

import { Role } from "@prisma/client";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import { getInitials, roleLabel } from "./nav-config";

import { GlobalInvoiceSearch } from "./global-invoice-search";



interface HeaderProps {

  userName: string;

  role: Role;

  onMenuClick?: () => void;

}



export function Header({ userName, role, onMenuClick }: HeaderProps) {

  const { theme, setTheme } = useTheme();

  const [profileOpen, setProfileOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  const profileRef = useRef<HTMLDivElement>(null);

  const initials = getInitials(userName);



  useEffect(() => {

    const onKeyDown = (e: KeyboardEvent) => {

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {

        e.preventDefault();

        searchRef.current?.focus();

      }

    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);

  }, []);



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

        "sticky top-0 z-30 flex h-[4.25rem] items-center gap-4 px-4 backdrop-blur-xl lg:px-6",

        "border-b border-[#E2E8F0] bg-white/85 shadow-[0_4px_24px_rgba(0,0,0,0.04)]",

        "dark:border-white/10 dark:bg-[#0B1730]/80 dark:shadow-[0_4px_24px_rgba(0,0,0,0.12)]"

      )}

    >

      <div className="flex min-w-0 shrink-0 items-center gap-3 lg:w-56">

        <Button

          variant="ghost"

          size="icon"

          className="shrink-0 text-slate-600 hover:bg-[#F1F5F9] hover:text-[#0284C7] lg:hidden dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"

          onClick={onMenuClick}

        >

          <Menu className="h-5 w-5" />

        </Button>

        <div className="min-w-0">

          <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg dark:text-white">

            MRA BLLING

          </h1>

          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{roleLabel(role)} Portal</p>

        </div>

      </div>



      <div className="hidden flex-1 justify-center md:flex">

        <GlobalInvoiceSearch inputRef={searchRef} />

      </div>



      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">

        <Button

          variant="ghost"

          size="icon"

          className={cn(

            "relative h-9 w-9 rounded-xl transition-all duration-200",

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

              <p className="max-w-[7rem] truncate text-xs font-semibold text-slate-900 dark:text-white">

                {userName}

              </p>

              <p className="text-[10px] text-slate-500 dark:text-slate-400">{roleLabel(role)}</p>

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

                <p className="text-xs text-slate-500 dark:text-slate-400">{roleLabel(role)}</p>

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

      </div>

    </header>

  );

}

