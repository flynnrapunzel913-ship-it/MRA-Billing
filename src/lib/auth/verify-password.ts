import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function verifyUserPassword(
  userId: string,
  plainPassword: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") return false;
  return bcrypt.compare(plainPassword, user.password);
}
