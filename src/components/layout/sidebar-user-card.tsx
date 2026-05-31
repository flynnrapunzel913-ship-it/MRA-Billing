"use client";



import { Role } from "@prisma/client";

import { cn } from "@/lib/utils";

import { getInitials, roleLabel } from "./nav-config";



export function SidebarUserCard({

  userName,

  role,

  className,

}: {

  userName: string;

  role: Role;

  className?: string;

}) {

  const initials = getInitials(userName);



  return (

    <div

      className={cn(

        "mx-3 mb-3 rounded-2xl p-3 transition-all duration-200",

        "border border-[#E2E8F0] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]",

        "hover:border-[#0EA5E9]/25",

        "dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] dark:backdrop-blur-xl",

        "dark:hover:border-[#38BDF8]/25",

        className

      )}

    >

      <div className="flex items-center gap-3">

        <div className="relative shrink-0">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8] text-sm font-bold text-white shadow-[0_0_16px_rgba(56,189,248,0.35)]">

            {initials}

          </div>

          <span

            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] dark:border-[#0B1730]"

            title="Online"

            aria-label="Online"

          />

        </div>

        <div className="min-w-0 flex-1">

          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{userName}</p>

          <p className="text-xs text-slate-500 dark:text-slate-400">{roleLabel(role)}</p>

          <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">

            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />

            Online

          </p>

        </div>

      </div>

    </div>

  );

}

