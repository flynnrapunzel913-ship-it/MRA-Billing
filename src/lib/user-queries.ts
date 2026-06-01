import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSchemaDriftError } from "@/lib/invoice-filters";

/** Bump when User model / UserActivity changes — keep in sync with prisma.ts */
export const PRISMA_CLIENT_MARKER = "user-management-v2";

export function isUserSchemaDriftError(error: unknown): boolean {
  if (isSchemaDriftError(error)) return true;
  if (error instanceof Prisma.PrismaClientValidationError) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("unknown field `status`") ||
      msg.includes("unknown argument `status`") ||
      msg.includes("useractivity")
    );
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("useractivity") ||
      msg.includes('"status"') ||
      msg.includes("userstatus")
    );
  }
  return false;
}

export function hasUserActivityDelegate(): boolean {
  const client = prisma as unknown as { userActivity?: { findMany?: unknown } };
  return typeof client.userActivity?.findMany === "function";
}

let userStatusSupported: boolean | undefined;

/** True when User.status column exists in DB and client supports it */
export async function supportsUserStatus(): Promise<boolean> {
  if (userStatusSupported !== undefined) return userStatusSupported;

  try {
    await prisma.user.findFirst({ select: { status: true } });
    userStatusSupported = true;
  } catch (error) {
    if (isUserSchemaDriftError(error)) {
      console.warn(
        "[supportsUserStatus] User.status missing — run: npm run db:deploy && npx prisma generate"
      );
      userStatusSupported = false;
    } else {
      throw error;
    }
  }

  return userStatusSupported;
}

export type SafeUserListItem = {
  id: string;
  username: string;
  role: string;
  status: "ACTIVE" | "DISABLED";
  createdAt: Date;
  _count: { invoices: number };
};

const baseUserSelect = {
  id: true,
  username: true,
  role: true,
  createdAt: true,
  _count: { select: { invoices: true } },
} as const;

export async function listUsers(): Promise<SafeUserListItem[]> {
  const withStatus = await supportsUserStatus();

  if (withStatus) {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { ...baseUserSelect, status: true },
    }) as Promise<SafeUserListItem[]>;
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: baseUserSelect,
  });

  return users.map((u) => ({ ...u, status: "ACTIVE" as const }));
}

export async function countActiveUsers(): Promise<number> {
  if (await supportsUserStatus()) {
    return prisma.user.count({ where: { status: "ACTIVE" } });
  }
  return prisma.user.count();
}

export async function createUserRecord(
  data: {
    username: string;
    password: string;
    role: "ADMIN" | "RECEPTIONIST";
  },
  db: Prisma.TransactionClient | typeof prisma = prisma
) {
  const withStatus = await supportsUserStatus();

  return db.user.create({
    data: withStatus
      ? {
          name: data.username,
          username: data.username,
          password: data.password,
          role: data.role,
          status: "ACTIVE",
        }
      : {
          name: data.username,
          username: data.username,
          password: data.password,
          role: data.role,
        },
    select: withStatus
      ? { id: true, username: true, role: true, status: true, createdAt: true }
      : { id: true, username: true, role: true, createdAt: true },
  });
}

export async function updateUserRecord(
  id: string,
  data: {
    username: string;
    role: "ADMIN" | "RECEPTIONIST";
    status: "ACTIVE" | "DISABLED";
    password?: string;
  },
  db: Prisma.TransactionClient | typeof prisma = prisma
) {
  const withStatus = await supportsUserStatus();

  const updateData: Prisma.UserUpdateInput = {
    name: data.username,
    username: data.username,
    role: data.role,
    ...(data.password ? { password: data.password } : {}),
    ...(withStatus ? { status: data.status } : {}),
  };

  const select = withStatus
    ? { id: true, username: true, role: true, status: true, createdAt: true }
    : { id: true, username: true, role: true, createdAt: true };

  const updated = await db.user.update({
    where: { id },
    data: updateData,
    select,
  });

  if (withStatus) {
    return updated as SafeUserListItem;
  }

  return { ...updated, status: "ACTIVE" as const };
}

export async function findUsersForDashboard(invoiceWhere: Prisma.InvoiceWhereInput) {
  const withStatus = await supportsUserStatus();
  const withActivities = hasUserActivityDelegate();

  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      ...(withStatus ? { status: true } : {}),
      invoices: {
        where: invoiceWhere,
        select: { grandTotal: true, createdAt: true },
      },
      ...(withActivities
        ? {
            activities: {
              orderBy: { createdAt: "desc" as const },
              take: 1,
              select: { createdAt: true },
            },
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });
}

export async function listRecentUserActivity(take = 20) {
  if (!hasUserActivityDelegate()) {
    return [];
  }

  try {
    return await prisma.userActivity.findMany({
      take,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    });
  } catch (error) {
    if (isUserSchemaDriftError(error)) {
      console.warn("[listRecentUserActivity] UserActivity table missing — run: npm run db:deploy");
      return [];
    }
    throw error;
  }
}

export function isUserDisabled(user: { status?: string | null }): boolean {
  return user.status === "DISABLED";
}
