import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

/**
 * Edge-safe Auth.js config — JWT/session callbacks only.
 * Used by middleware. No providers, Prisma, or bcrypt.
 */
export const authConfig = {
  secret: process.env.AUTH_SECRET,
  // Require AUTH_URL in production; only trust Host header in local development.
  trustHost: process.env.NODE_ENV !== "production",
  session: { strategy: "jwt" as const },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
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
        session.user.role = token.role as Role;
        session.user.username = token.username as string;
        session.user.name = token.username as string;
        session.user.sessionVersion =
          (token.sessionVersion as number | undefined) ?? 0;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
