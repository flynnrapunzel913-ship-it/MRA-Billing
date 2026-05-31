export function AppBackground({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/backgrounds/pool-background.png)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[#f8fbff]/78 backdrop-blur-[2px] dark:bg-[#0b1220]/82"
        aria-hidden
      />
      <div className="relative min-h-screen">{children}</div>
    </>
  );
}
