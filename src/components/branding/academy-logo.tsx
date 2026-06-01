"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

import { ACADEMY_LOGO_PATH } from "@/lib/branding-assets";

/** Canonical MR Academy logo served from /public/branding */
export const ACADEMY_LOGO_SRC = ACADEMY_LOGO_PATH;

type AcademyLogoProps = {
  className?: string;
  alt?: string;
};

/** Logo image — fixed height, auto width, never stretched */
export function AcademyLogo({ className, alt = "MR Academy" }: AcademyLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ACADEMY_LOGO_SRC}
      alt={alt}
      className={cn("h-20 w-auto max-w-full object-contain object-center", className)}
      decoding="async"
    />
  );
}

/** Premium logo card for sidebar / mobile drawer — logo only, no caption text */
export function SidebarBrand({ className }: { className?: string }) {
  return (
    <div className={cn("border-b border-border/50 px-4 py-3", className)}>
      <Link
        href="/dashboard"
        className="group mx-auto block w-fit outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl"
        aria-label="MR Academy home"
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-white/10 bg-card/50 p-2.5",
            "shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-md",
            "transition-all duration-200",
            "hover:border-primary/25 hover:bg-card/70",
            "hover:shadow-[0_8px_30px_rgba(0,112,192,0.28),0_0_24px_rgba(56,189,248,0.12)]",
            "dark:border-white/[0.08] dark:bg-white/[0.04]"
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[#0070C0]/10 via-transparent to-[#38bdf8]/10 opacity-80"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -inset-px rounded-2xl bg-[#0070C0]/0 blur-xl transition-opacity duration-200 group-hover:bg-[#0070C0]/15"
            aria-hidden
          />
          <div className="relative flex items-center justify-center">
            <AcademyLogo />
          </div>
        </div>
      </Link>
    </div>
  );
}
