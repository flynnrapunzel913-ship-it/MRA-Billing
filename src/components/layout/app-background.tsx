"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function AppBackground({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = !mounted ? true : resolvedTheme === "dark";

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 -z-30 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/backgrounds/pool-background.png?v=2)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-20 transition-colors duration-300"
        style={{ backgroundColor: "var(--overlay)" }}
        aria-hidden
      />
      {!isDark && (
        <div className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-300" aria-hidden>
          <div className="absolute inset-0 bg-gradient-to-br from-[#00C2FF]/12 via-[#e8f7fc]/78 to-[#00E5D4]/10" />
        </div>
      )}
      {isDark && (
        <div className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-300" aria-hidden>
          <div className="absolute inset-0 bg-gradient-to-br from-[#00C2FF]/8 via-[#041018]/90 to-[#00E5D4]/6" />
          <div className="absolute inset-0 bg-[#020810]/35" />
        </div>
      )}
      <div className="relative min-h-screen text-foreground">{children}</div>
    </>
  );
}
