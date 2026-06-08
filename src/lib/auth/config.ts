import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  isUserDisabled,
  supportsSessionVersion,
  supportsUserStatus,
} from "@/lib/user-queries";
import { logDisabledUserAccessAttempt } from "@/lib/auth/disabled-access-audit";
import { logLoginFailed, usernameFromCredentials } from "@/lib/auth/login-audit";

const loginSchema = z.object({
  username: z.string().min(3).regex(/^\S+$/),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          logLoginFailed({
            reason: "invalid_input",
            username: usernameFromCredentials(credentials),
          });
          return null;
        }

        const withStatus = await supportsUserStatus();
        const withVersion = await supportsSessionVersion();
        const username = parsed.data.username.toLowerCase();
        const user = await prisma.user.findUnique({
          where: { username },
          select: {
            id: true,
            username: true,
            password: true,
            role: true,
            ...(withStatus ? { status: true } : {}),
            ...(withVersion ? { sessionVersion: true } : {}),
          },
        });

        if (!user) {
          logLoginFailed({ reason: "user_not_found", username });
          return null;
        }

        if (isUserDisabled(user as { status?: string })) {
          logDisabledUserAccessAttempt({
            userId: user.id,
            username: user.username,
            source: "login",
          });
          return null;
        }

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) {
          logLoginFailed({
            reason: "invalid_password",
            username: user.username,
            userId: user.id,
          });
          return null;
        }

        const { recordUserActivity } = await import("@/lib/user-activity");
        void recordUserActivity(prisma, user.id, "LOGIN", `${user.username} logged in`);

        return {
          id: user.id,
          name: user.username,
          username: user.username,
          role: user.role,
          sessionVersion: withVersion
            ? (user as { sessionVersion: number }).sessionVersion
            : 0,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Edge-safe: no Prisma. DB re-validation runs in Node (guards, dashboard layout).
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = (user as { username?: string }).username ?? user.name ?? "";
        token.sessionVersion =
          (user as { sessionVersion?: number }).sessionVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "RECEPTIONIST";
        session.user.username = token.username as string;
        session.user.name = token.username as string;
        session.user.sessionVersion =
          (token.sessionVersion as number | undefined) ?? 0;
      }
      return session;
    },
  },
});
