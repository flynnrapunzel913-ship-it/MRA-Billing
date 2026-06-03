"use client";

import { Role } from "@prisma/client";
import { AcademyLogo } from "@/components/branding/academy-logo";
import { cn } from "@/lib/utils";
import { SessionControlPill } from "./session-control-pill";

interface FloatingHeaderProps {
  role: Role;
}

export function FloatingHeader({ role }: FloatingHeaderProps) {
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
        <SessionControlPill role={role} />
      </div>
    </header>
  );
}
