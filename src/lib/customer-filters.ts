import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSchemaDriftError } from "@/lib/invoice-filters";

/** Cached after first schema probe — defaults to soft-delete filter for speed */
let cachedActiveCustomerWhere: Prisma.CustomerWhereInput = { deletedAt: null };
let customerSchemaProbeDone = false;

/**
 * Returns `{ deletedAt: null }` when soft-delete migration is applied,
 * or `{}` when the column does not exist yet (avoids crashing list/dashboard APIs).
 */
export async function getActiveCustomerWhere(): Promise<Prisma.CustomerWhereInput> {
  if (customerSchemaProbeDone) {
    return cachedActiveCustomerWhere;
  }

  try {
    await prisma.customer.findFirst({
      where: { deletedAt: null },
      select: { id: true },
    });
    cachedActiveCustomerWhere = { deletedAt: null };
  } catch (error) {
    if (isSchemaDriftError(error)) {
      console.warn(
        "[getActiveCustomerWhere] Customer.deletedAt missing — run: npx prisma migrate deploy"
      );
      cachedActiveCustomerWhere = {};
    } else {
      throw error;
    }
  }

  customerSchemaProbeDone = true;
  return cachedActiveCustomerWhere;
}

/** @deprecated Use getActiveCustomerWhere() */
export const activeCustomerWhere = { deletedAt: null } as const;

export function activeCustomerFilter<T extends Prisma.CustomerWhereInput>(
  where: T,
  customerWhere: Prisma.CustomerWhereInput
): T & Prisma.CustomerWhereInput {
  return { ...where, ...customerWhere };
}
