import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { DM_Sans, Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { Providers } from "@/components/providers";
import { AppBackground } from "@/components/layout/app-background";
import { UI_PREFS_BOOTSTRAP_SCRIPT } from "@/lib/ui-preferences";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Billing System | MR Academy",
  description: "Professional GST invoice and billing management for MR Academy Swimming",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVariables = [
    sourceSerif.variable,
    inter.variable,
    dmSans.variable,
    jetbrainsMono.variable,
  ].join(" ");

  return (
    <html lang="en" suppressHydrationWarning data-ui-font="sans" data-ui-font-size="medium">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='mra-billing-theme',t=localStorage.getItem(k),d=document.documentElement;if(t==='light'){d.classList.remove('dark');}else if(t==='dark'||!t){d.classList.add('dark');}else if(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches){d.classList.add('dark');}else{d.classList.remove('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: UI_PREFS_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className={`${fontVariables} antialiased`} suppressHydrationWarning>
        <Providers>
          <AppBackground>{children}</AppBackground>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
