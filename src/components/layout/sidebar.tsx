"use client";



import { Role } from "@prisma/client";

import { cn } from "@/lib/utils";

import { getNavGroupsForRole } from "./nav-config";

import { SidebarNavGroups } from "./sidebar-nav-link";

import { SidebarLogoCard } from "./sidebar-logo-card";

import { SidebarUserCard } from "./sidebar-user-card";



const sidebarShellClass = cn(

  "relative flex min-h-screen h-screen w-64 shrink-0 flex-col border-r",

  "border-[#E2E8F0] bg-white shadow-[4px_0_24px_rgba(0,0,0,0.03)]",

  "dark:border-white/[0.08] dark:bg-gradient-to-b dark:from-[#07111F] dark:via-[#0B1730] dark:to-[#0D2342] dark:shadow-none"

);



function SidebarWaveOverlay() {

  return (

    <>

      <div

        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.04]"

        style={{

          backgroundImage: "url(/backgrounds/pool-background.png)",

          backgroundSize: "cover",

          backgroundPosition: "center",

        }}

        aria-hidden

      />

      <div

        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0EA5E9]/[0.04] via-transparent to-[#38BDF8]/[0.06] dark:from-[#38BDF8]/[0.03] dark:to-[#0EA5E9]/[0.05]"

        aria-hidden

      />

    </>

  );

}



export function Sidebar({

  role,

  userName,

  className,

  onNavigate,

}: {

  role: Role;

  userName: string;

  className?: string;

  onNavigate?: () => void;

}) {

  const groups = getNavGroupsForRole(role);



  return (

    <aside className={cn(sidebarShellClass, "hidden lg:sticky lg:top-0 lg:flex", className)}>

      <SidebarWaveOverlay />

      <div className="relative z-10 flex h-full min-h-0 flex-col">

        <SidebarLogoCard />

        <nav className="flex-1 overflow-y-auto px-3 py-2">

          <SidebarNavGroups groups={groups} onNavigate={onNavigate} />

        </nav>

        <SidebarUserCard userName={userName} role={role} />

      </div>

    </aside>

  );

}



export function MobileSidebar({

  role,

  userName,

  onNavigate,

}: {

  role: Role;

  userName: string;

  onNavigate?: () => void;

}) {

  const groups = getNavGroupsForRole(role);



  return (

    <aside className={cn(sidebarShellClass, "flex h-full flex-col")}>

      <SidebarWaveOverlay />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col pt-14">

        <SidebarLogoCard />

        <nav className="flex-1 overflow-y-auto px-3 py-2">

          <SidebarNavGroups groups={groups} onNavigate={onNavigate} />

        </nav>

        <SidebarUserCard userName={userName} role={role} />

      </div>

    </aside>

  );

}

