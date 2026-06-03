import type { Prisma } from "@prisma/client";
import { Role } from "@prisma/client";

export const stockListInclude = {
  createdBy: { select: { id: true, username: true, name: true, role: true } },
} satisfies Prisma.StockEntryInclude;

export function buildStockWhere(
  params: URLSearchParams,
  role: Role
): Prisma.StockEntryWhereInput {
  const q = params.get("q")?.trim() || "";
  const category = params.get("category")?.trim();
  const supplier = params.get("supplier")?.trim();
  const createdBy = params.get("createdBy")?.trim();
  const from = params.get("from")?.trim();
  const to = params.get("to")?.trim();

  const and: Prisma.StockEntryWhereInput[] = [];

  if (q) {
    and.push({
      OR: [
        { itemName: { contains: q, mode: "insensitive" } },
        { supplierName: { contains: q, mode: "insensitive" } },
        { stockNumber: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (category && category !== "all") {
    and.push({ category });
  }

  if (supplier && supplier !== "all") {
    and.push({ supplierName: { contains: supplier, mode: "insensitive" } });
  }

  if (role === Role.ADMIN && createdBy && createdBy !== "all") {
    and.push({ createdById: createdBy });
  }

  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) {
      and.push({ purchaseDate: { gte: d } });
    }
  }

  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      and.push({ purchaseDate: { lte: d } });
    }
  }

  return and.length ? { AND: and } : {};
}
