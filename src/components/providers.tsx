"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { UiPreferencesProvider } from "@/components/providers/ui-preferences-provider";
import { PreventNumberInputWheel } from "@/components/prevent-number-input-wheel";

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
        <UiPreferencesProvider>
          <PreventNumberInputWheel />
          {children}
          <Toaster richColors position="top-right" theme="system" />
        </UiPreferencesProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
