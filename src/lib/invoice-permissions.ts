import { Role } from "@prisma/client";

export function canDeleteInvoice(
  role: Role | string | undefined,
  userId: string | undefined,
  invoice: { createdById?: string | null }
): boolean {
  if (role === Role.ADMIN) return true;
  if (!userId || !invoice.createdById) return false;
  return invoice.createdById === userId;
}
