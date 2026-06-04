import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loadActiveAccount } from "@/lib/auth/session";
import { isUserDisabled } from "@/lib/user-queries";

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
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { username: parsed.data.username.toLowerCase() },
        });

        if (!user) return null;

        if (isUserDisabled(user as { status?: string })) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        const { recordUserActivity } = await import("@/lib/user-activity");
        void recordUserActivity(prisma, user.id, "LOGIN", `${user.name} logged in`);

        return {
          id: user.id,
          name: user.username,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = (user as { username?: string }).username ?? user.name ?? "";
      }

      // Re-validate account on each session/JWT refresh (disabled users lose access immediately).
      const userId = token.id as string | undefined;
      if (userId) {
        const account = await loadActiveAccount(userId);
        if (!account || account.disabled) {
          token.revoked = true;
        } else {
          token.revoked = false;
          token.role = account.role;
          token.username = account.username;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.revoked) {
        return { ...session, user: undefined, expires: new Date(0).toISOString() };
      }

      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "RECEPTIONIST";
        session.user.username = token.username as string;
        session.user.name = token.username as string;
      }
      return session;
    },
  },
});
