import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** True when DB is missing columns/tables from pending migrations */
export function isSchemaDriftError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2021" || error.code === "P2022";
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("deletedat") ||
      msg.includes("customeractivity") ||
      msg.includes("emergencycontact") ||
      msg.includes("parentname") ||
      msg.includes("useractivity") ||
      msg.includes('"status"') ||
      msg.includes("userstatus") ||
      msg.includes("unknown field `status`") ||
      msg.includes("does not exist") ||
      msg.includes("unknown column")
    );
  }
  return false;
}

let cachedActiveInvoiceWhere: Prisma.InvoiceWhereInput | undefined;

/**
 * Returns `{ deletedAt: null }` when soft-delete migration is applied,
 * or `{}` when the column does not exist yet (avoids crashing list/dashboard APIs).
 */
export async function getActiveInvoiceWhere(): Promise<Prisma.InvoiceWhereInput> {
  if (cachedActiveInvoiceWhere !== undefined) {
    return cachedActiveInvoiceWhere;
  }

  try {
    await prisma.invoice.findFirst({
      where: { deletedAt: null },
      select: { id: true },
    });
    cachedActiveInvoiceWhere = { deletedAt: null };
  } catch (error) {
    if (isSchemaDriftError(error)) {
      console.warn(
        "[getActiveInvoiceWhere] Invoice.deletedAt missing — run: npx prisma migrate deploy"
      );
      cachedActiveInvoiceWhere = {};
    } else {
      throw error;
    }
  }

  return cachedActiveInvoiceWhere;
}

/** @deprecated Use getActiveInvoiceWhere() */
export const activeInvoiceWhere = { deletedAt: null } as const;

export function activeInvoiceFilter<T extends Prisma.InvoiceWhereInput>(
  where: T,
  invoiceWhere: Prisma.InvoiceWhereInput
): T & Prisma.InvoiceWhereInput {
  return { ...where, ...invoiceWhere };
}
