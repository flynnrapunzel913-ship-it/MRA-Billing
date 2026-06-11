import { CatalogItemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type {
  CatalogCategory,
  CatalogPlan,
} from "@/lib/subscription-catalog";

export {
  planInvoiceDescription,
  packageEndDateFromPlan,
  formatDurationLabel,
  listSubscriptionCategories,
  listActiveCatalogPlans,
} from "@/lib/subscription-catalog";

/** @deprecated Use CatalogPlan */
export type CatalogSubscription = {
  id: string;
  name: string;
  description: string | null;
  duration: string;
  price: number;
  status: CatalogItemStatus;
  createdAt: string;
  updatedAt: string;
};

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

/** @deprecated Use planInvoiceDescription */
export function subscriptionInvoiceDescription(name: string, duration: string) {
  const trimmed = duration.trim();
  if (!trimmed) return name;
  return `${name} (${trimmed})`;
}

/** @deprecated Use packageEndDateFromPlan */
export function packageEndDateFromDuration(startDate: string, duration: string): string {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return "";

  const d = duration.toLowerCase();
  const end = new Date(start);

  const monthMatch = d.match(/(\d+)\s*month/);
  if (monthMatch) {
    end.setMonth(end.getMonth() + Number(monthMatch[1]));
    return end.toISOString().split("T")[0];
  }

  if (d.includes("annual") || d.includes("year") || d.match(/1\s*yr/)) {
    end.setFullYear(end.getFullYear() + 1);
    return end.toISOString().split("T")[0];
  }

  if (d.includes("week")) {
    const weekMatch = d.match(/(\d+)\s*week/);
    const weeks = weekMatch ? Number(weekMatch[1]) : 1;
    end.setDate(end.getDate() + weeks * 7);
    return end.toISOString().split("T")[0];
  }

  return "";
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
