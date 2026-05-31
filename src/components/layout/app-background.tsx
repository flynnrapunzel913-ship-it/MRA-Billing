export function AppBackground({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Pool watermark — subtle in light, full in dark */}
      <div
        className="pointer-events-none fixed inset-0 -z-30 bg-cover bg-center bg-no-repeat opacity-[0.035] dark:opacity-100"
        style={{ backgroundImage: "url(/backgrounds/pool-background.png)" }}
        aria-hidden
      />

      {/* Light: soft blue-tinted base (no dark overlay) */}
      <div
        className="pointer-events-none fixed inset-0 -z-20 bg-[#F8FBFF] dark:hidden"
        aria-hidden
      />

      {/* Dark: pool dimming overlay — unchanged */}
      <div
        className="pointer-events-none fixed inset-0 -z-20 hidden bg-black/50 dark:block"
        aria-hidden
      />

      {/* Light: radial glows + gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10 dark:hidden" aria-hidden>
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[#0EA5E9]/10 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#38BDF8]/8 blur-[90px]" />
        <div className="absolute left-1/2 top-1/3 h-64 w-[32rem] -translate-x-1/2 rounded-full bg-[#0284C7]/6 blur-[80px]" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0EA5E9]/[0.06] via-[#F8FBFF]/80 to-[#38BDF8]/[0.08]" />
      </div>

      {/* Dark: gradient overlay — unchanged */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 hidden bg-gradient-to-br from-[#0070C0]/15 via-[#0b1220]/50 to-[#38bdf8]/12 dark:block"
        aria-hidden
      />

      <div className="relative min-h-screen">{children}</div>
    </>
  );
}
