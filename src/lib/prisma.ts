import { PrismaClient } from "@prisma/client";

/** Bump when User model / UserActivity changes to bust dev global Prisma cache */
export const PRISMA_CLIENT_MARKER = "subscription-duration-v1";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaMarker: string | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  if (
    process.env.NODE_ENV !== "production" &&
    globalForPrisma.prisma &&
    globalForPrisma.prismaMarker !== PRISMA_CLIENT_MARKER
  ) {
    void globalForPrisma.prisma.$disconnect().catch(() => undefined);
    globalForPrisma.prisma = undefined;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaMarker = PRISMA_CLIENT_MARKER;
  }

  return globalForPrisma.prisma;
}

export const prisma = getPrismaClient();
