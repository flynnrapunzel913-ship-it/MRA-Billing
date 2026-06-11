import { CatalogItemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type {
  PricingRow,
  PricingSectionGroup,
} from "@/lib/subscription-pricing";

export {
  pricingInvoiceDescription,
  sectionTitle,
  listSubscriptionPricing,
  listPricingCatalog,
  PRICING_SECTION_META,
  PRICING_SECTION_ORDER,
} from "@/lib/subscription-pricing";

export type CatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  status: CatalogItemStatus;
  createdAt: string;
  updatedAt: string;
};

export function serializeProduct(row: {
  id: string;
  name: string;
  description: string | null;
  price: unknown;
  status: CatalogItemStatus;
  createdAt: Date;
  updatedAt: Date;
}): CatalogProduct {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function searchProducts(q: string, activeOnly: boolean) {
  return prisma.academyProduct.findMany({
    where: {
      ...(activeOnly ? { status: "ACTIVE" } : {}),
      ...(q.trim()
        ? {
            OR: [
              { name: { contains: q.trim(), mode: "insensitive" } },
              { description: { contains: q.trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
}
