"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AcademyLogo } from "@/components/branding/academy-logo";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Only allow same-origin relative paths (middleware callbackUrl). */
function resolvePostLoginPath(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  if (raw.startsWith("/login")) return "/dashboard";
  return raw;
}

function absoluteCallbackUrl(path: string): string {
  return new URL(path, window.location.origin).href;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "admin", password: "admin123" },
  });

  useEffect(() => {
    const error = searchParams.get("error");
    const message = searchParams.get("message");
    if (error === "account_disabled") {
      toast.error(message ?? "Your account has been disabled by an administrator.");
    } else if (error === "session_invalid") {
      toast.error("Your session has ended. Please sign in again.");
    }
  }, [searchParams]);

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    const postLoginPath = resolvePostLoginPath(searchParams.get("callbackUrl"));
    // NextAuth signIn(redirect:false) does `new URL(data.url)` — must not use the login
    // page href (e.g. /login?error=session_invalid) as redirectTo or a relative data.url throws.
    const callbackUrl = absoluteCallbackUrl(postLoginPath);

    const result = await signIn("credentials", {
      username: data.username,
      password: data.password,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);

    if (!result || result.error || result.ok === false) {
      toast.error("Invalid username or password");
      return;
    }

    toast.success("Welcome back!");
    // Full navigation so the Set-Cookie from sign-in is on the request middleware sees.
    // router.push() alone can race the session cookie and leave the user on /login.
    router.refresh();
    window.location.assign(postLoginPath);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 pb-8">
      <Card className="w-full max-w-md border-[#00C2FF]/25 shadow-[0_16px_48px_rgba(0,194,255,0.15)]">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <AcademyLogo className="h-24 sm:h-28" />
          </div>
          <div>
            <CardTitle className="text-xl uppercase tracking-[0.12em]">Billing System</CardTitle>
            <CardDescription>Swimming academy — sign in to continue</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" type="text" placeholder="Enter username" {...register("username")} />
              {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Demo: admin / admin123
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted-foreground">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
