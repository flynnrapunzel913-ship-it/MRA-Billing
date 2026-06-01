"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        enableColorScheme
        storageKey="mra-billing-theme"
        disableTransitionOnChange={false}
      >
        {children}
        <Toaster richColors position="top-right" theme="system" />
      </ThemeProvider>
    </SessionProvider>
  );
}
