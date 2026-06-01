"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, Settings } from "lucide-react";
import { Role } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getInitials, roleLabel } from "./nav-config";

export function ProfileView({
  userName,
  email,
  role,
}: {
  userName: string;
  email: string;
  role: Role;
}) {
  const initials = getInitials(userName);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00C2FF] to-[#00E5D4] text-xl font-bold text-white shadow-[0_0_24px_rgba(0,194,255,0.4)]">
            {initials}
          </div>
          <CardTitle>{userName}</CardTitle>
          <p className="text-sm text-muted-foreground">{email}</p>
          <span className="mt-1 inline-flex rounded-full border border-[#00C2FF]/30 bg-[#00C2FF]/10 px-3 py-0.5 text-xs font-semibold text-[#00A8D4] dark:text-[#00E5D4]">
            {roleLabel(role)}
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {role === "ADMIN" && (
            <Button variant="outline" asChild className="w-full justify-center">
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Academy Settings
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full justify-center text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
