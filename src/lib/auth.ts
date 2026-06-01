import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./prisma";

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

        const { isUserDisabled } = await import("@/lib/user-queries");
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
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "RECEPTIONIST";
        session.user.username = token.username as string;
        session.user.name = token.username as string;
      }
      return session;
    },
  },
});
