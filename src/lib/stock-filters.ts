import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSchemaDriftError } from "@/lib/invoice-filters";

/** Cached after first schema probe — defaults to soft-delete filter for speed */
let cachedActiveStockWhere: Prisma.StockEntryWhereInput = { deletedAt: null };
let stockSchemaProbeDone = false;

/**
 * Returns `{ deletedAt: null }` when soft-delete migration is applied,
 * or `{}` when the column does not exist yet (avoids crashing list/summary APIs).
 */
export async function getActiveStockWhere(): Promise<Prisma.StockEntryWhereInput> {
  if (stockSchemaProbeDone) {
    return cachedActiveStockWhere;
  }

  try {
    await prisma.stockEntry.findFirst({
      where: { deletedAt: null },
      select: { id: true },
    });
    cachedActiveStockWhere = { deletedAt: null };
  } catch (error) {
    if (isSchemaDriftError(error)) {
      console.warn(
        "[getActiveStockWhere] StockEntry.deletedAt missing — run: npx prisma migrate deploy"
      );
      cachedActiveStockWhere = {};
    } else {
      throw error;
    }
  }

  stockSchemaProbeDone = true;
  return cachedActiveStockWhere;
}

/** Returns `{ deletedAt: { not: null } }` when soft-delete is available, else `{}`. */
export async function getDeletedStockWhere(): Promise<Prisma.StockEntryWhereInput> {
  const activeWhere = await getActiveStockWhere();
  if (Object.keys(activeWhere).length === 0) {
    return {};
  }
  return { deletedAt: { not: null } };
}

/** @deprecated Use getActiveStockWhere() */
export const activeStockWhere = { deletedAt: null } as const;

export function activeStockFilter<T extends Prisma.StockEntryWhereInput>(
  where: T,
  stockWhere: Prisma.StockEntryWhereInput
): T & Prisma.StockEntryWhereInput {
  return { ...where, ...stockWhere };
}
