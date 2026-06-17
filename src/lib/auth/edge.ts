import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

/** Middleware-only auth — reads JWT; no database or credential providers. */
const { auth } = NextAuth(authConfig);

export { auth as edgeAuth };
