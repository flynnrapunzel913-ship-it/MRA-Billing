"use client";



import Link from "next/link";

import { cn } from "@/lib/utils";

import { AcademyLogo } from "@/components/branding/academy-logo";



export function SidebarLogoCard({ className }: { className?: string }) {

  return (

    <div className={cn("px-4 py-4", className)}>

      <Link

        href="/dashboard"

        className="group mx-auto block w-fit outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/40 rounded-2xl dark:focus-visible:ring-[#38BDF8]/50"

        aria-label="MR Academy home"

      >

        <div

          className={cn(

            "relative flex items-center justify-center overflow-hidden rounded-2xl p-3 transition-all duration-300",

            "border border-[#E2E8F0] bg-white",

            "shadow-[0_8px_30px_rgba(0,0,0,0.06)]",

            "hover:scale-[1.02] hover:border-[#0EA5E9]/30",

            "hover:shadow-[0_8px_30px_rgba(14,165,233,0.12)]",

            "dark:border-white/10 dark:bg-white/[0.06] dark:backdrop-blur-xl",

            "dark:shadow-[0_8px_32px_rgba(0,0,0,0.35),0_0_24px_rgba(56,189,248,0.12)]",

            "dark:hover:border-[#38BDF8]/40",

            "dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_32px_rgba(56,189,248,0.22)]"

          )}

        >

          <div

            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0EA5E9]/10 via-transparent to-[#38BDF8]/8 dark:from-[#0EA5E9]/15 dark:to-[#38BDF8]/10"

            aria-hidden

          />

          <div className="relative">

            <AcademyLogo className="h-14" />

          </div>

        </div>

      </Link>

    </div>

  );

}

