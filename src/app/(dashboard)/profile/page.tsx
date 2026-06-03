"use client";

import { useSession } from "next-auth/react";
import { UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { AppearanceSettings } from "@/components/profile/appearance-settings";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { roleLabel } from "@/components/layout/nav-config";

type ProfileData = {
  username: string;
  name: string;
  email: string | null;
  role: "ADMIN" | "RECEPTIONIST";
  uiFontFamily: string;
  uiFontSize: string;
};

export default function ProfilePage() {
  const { data: session } = useSession();
  const { data: profile, isInitialLoading } = useCachedFetch<ProfileData>("/api/profile");

  if (isInitialLoading && !profile) {
    return <PageSkeleton className="mx-auto max-w-2xl" />;
  }

  const username = profile?.username ?? session?.user?.username ?? "—";
  const displayName = profile?.name ?? session?.user?.name ?? username;
  const role = profile?.role ?? session?.user?.role ?? "RECEPTIONIST";

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Account details and how the app looks for you
        </p>
      </div>

      <Card className="glass-panel overflow-hidden">
        <CardHeader className="border-b border-border/60">
          <div className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Account</CardTitle>
          </div>
          <CardDescription>Signed-in user on this device</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Display name
            </p>
            <p className="mt-1 font-semibold text-foreground">{displayName}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Username
            </p>
            <p className="mt-1 font-mono text-sm text-foreground">{username}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Role
            </p>
            <Badge variant="secondary" className="mt-1">
              {roleLabel(role)}
            </Badge>
          </div>
          {profile?.email ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </p>
              <p className="mt-1 text-sm text-foreground">{profile.email}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <AppearanceSettings />
    </div>
  );
}
