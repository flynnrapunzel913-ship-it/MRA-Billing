"use client";

import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { AcademyLogo } from "@/components/branding/academy-logo";
import { SessionControlPill } from "./session-control-pill";

interface FloatingHeaderProps {
  role: Role;
}

/** Row 1: logo (left) | centered title | user controls (right). Equal side columns keep title centered. */
export function FloatingHeader({ role }: FloatingHeaderProps) {
  return (
    <header
      className={cn(
        "grid w-full grid-cols-[1fr_auto_1fr] items-center gap-x-3 sm:gap-x-4",
        "min-h-[3.5rem] sm:min-h-[4rem]"
      )}
    >
      <div className="flex items-center justify-self-start">
        <AcademyLogo className="h-12 w-auto sm:h-14 lg:h-16" />
      </div>

      <h1 className="justify-self-center text-center text-xs font-bold uppercase tracking-[0.16em] text-foreground sm:text-sm lg:text-base">
        Billing System
      </h1>

      <div className="flex items-center justify-self-end">
        <SessionControlPill role={role} />
      </div>
    </header>
  );
}
