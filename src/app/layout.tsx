import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import { Providers } from "@/components/providers";
import { AppBackground } from "@/components/layout/app-background";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Billing System | MR Academy",
  description: "Professional GST invoice and billing management for MR Academy Swimming",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='mra-billing-theme',t=localStorage.getItem(k),d=document.documentElement;if(t==='light'){d.classList.remove('dark');}else if(t==='dark'||!t){d.classList.add('dark');}else if(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches){d.classList.add('dark');}else{d.classList.remove('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body className={`${sourceSerif.variable} ${sourceSerif.className} antialiased`}>
        <Providers>
          <AppBackground>{children}</AppBackground>
        </Providers>
      </body>
    </html>
  );
}
