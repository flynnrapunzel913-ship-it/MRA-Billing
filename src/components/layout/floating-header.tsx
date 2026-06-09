"use client";

import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { SessionControlPill } from "./session-control-pill";

interface FloatingHeaderProps {
  role: Role;
}

/** Title + session row (logo lives in parent chrome grid for vertical centering). */
export function FloatingHeader({ role }: FloatingHeaderProps) {
  return (
    <header
      className={cn(
        "grid w-full grid-cols-[1fr_auto] items-center gap-2",
        "min-h-[3.5rem] sm:min-h-[4rem]"
      )}
    >
      <h1 className="text-center text-xs font-bold uppercase tracking-[0.16em] text-foreground sm:text-sm lg:text-base">
        Billing System
      </h1>

      <div className="flex shrink-0 items-center justify-end">
        <SessionControlPill role={role} />
      </div>
    </header>
  );
}
