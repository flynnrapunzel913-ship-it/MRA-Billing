export function AppBackground({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 -z-30 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/backgrounds/pool-background.png)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-20 bg-black/40 dark:bg-black/50"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-[#0070C0]/12 via-[#f8fbff]/55 to-[#38bdf8]/10 dark:from-[#0070C0]/15 dark:via-[#0b1220]/50 dark:to-[#38bdf8]/12"
        aria-hidden
      />
      <div className="relative min-h-screen">{children}</div>
    </>
  );
}
