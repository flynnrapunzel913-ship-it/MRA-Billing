import type { DurationUnit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toJsonNumber } from "@/lib/serialize-prisma";

export type CatalogPlan = {
  id: string;
  categoryId: string;
  categoryName: string;
  planName: string;
  price: number;
  durationValue: number | null;
  durationUnit: DurationUnit | null;
  sessionCount: number | null;
  validityDays: number | null;
  description: string | null;
  isActive: boolean;
  durationLabel: string;
};

export type CatalogCategory = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  plans: CatalogPlan[];
  createdAt: string;
  updatedAt: string;
};

const DURATION_UNIT_LABELS: Record<DurationUnit, string> = {
  DAY: "day",
  MONTH: "month",
  YEAR: "year",
  CLASS: "class",
  HOUR: "hour",
  CUSTOM: "",
};

export function formatDurationLabel(plan: {
  durationValue?: number | null;
  durationUnit?: DurationUnit | null;
  sessionCount?: number | null;
  validityDays?: number | null;
  description?: string | null;
  planName?: string;
}): string {
  if (plan.durationUnit === "CLASS" && plan.sessionCount && plan.validityDays) {
    return `${plan.sessionCount} Classes / ${plan.validityDays} Days`;
  }
  if (plan.durationValue && plan.durationUnit && plan.durationUnit !== "CUSTOM") {
    const unit = DURATION_UNIT_LABELS[plan.durationUnit];
    const plural = plan.durationValue === 1 ? unit : `${unit}s`;
    return `${plan.durationValue} ${plural}`;
  }
  return plan.description?.trim() || plan.planName?.trim() || "";
}

export function planInvoiceDescription(categoryName: string, planName: string, durationLabel?: string) {
  const label = durationLabel?.trim();
  if (label && label !== planName.trim()) {
    return `${categoryName} — ${planName} (${label})`;
  }
  return `${categoryName} — ${planName}`;
}

export function packageEndDateFromPlan(
  startDate: string,
  plan: {
    durationValue?: number | null;
    durationUnit?: DurationUnit | null;
    validityDays?: number | null;
  }
): string {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return "";

  const end = new Date(start);

  if (plan.validityDays && plan.validityDays > 0) {
    end.setDate(end.getDate() + plan.validityDays);
    return end.toISOString().split("T")[0];
  }

  if (!plan.durationValue || !plan.durationUnit) return "";

  switch (plan.durationUnit) {
    case "MONTH":
      end.setMonth(end.getMonth() + plan.durationValue);
      break;
    case "YEAR":
      end.setFullYear(end.getFullYear() + plan.durationValue);
      break;
    case "DAY":
      end.setDate(end.getDate() + plan.durationValue);
      break;
    case "CLASS":
    case "HOUR":
    case "CUSTOM":
    default:
      return "";
  }

  return end.toISOString().split("T")[0];
}

function serializePlan(
  row: {
    id: string;
    categoryId: string;
    planName: string;
    price: unknown;
    durationValue: number | null;
    durationUnit: DurationUnit | null;
    sessionCount: number | null;
    validityDays: number | null;
    description: string | null;
    isActive: boolean;
    category?: { name: string };
  },
  categoryName?: string
): CatalogPlan {
  const name = categoryName ?? row.category?.name ?? "";
  return {
    id: row.id,
    categoryId: row.categoryId,
    categoryName: name,
    planName: row.planName,
    price: toJsonNumber(row.price),
    durationValue: row.durationValue,
    durationUnit: row.durationUnit,
    sessionCount: row.sessionCount,
    validityDays: row.validityDays,
    description: row.description,
    isActive: row.isActive,
    durationLabel: formatDurationLabel(row),
  };
}

export function serializeCategory(row: {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  plans?: Array<{
    id: string;
    categoryId: string;
    planName: string;
    price: unknown;
    durationValue: number | null;
    durationUnit: DurationUnit | null;
    sessionCount: number | null;
    validityDays: number | null;
    description: string | null;
    isActive: boolean;
  }>;
}): CatalogCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    plans: (row.plans ?? []).map((plan) => serializePlan({ ...plan, category: { name: row.name } })),
  };
}

export async function listSubscriptionCategories(options?: {
  q?: string;
  activeOnly?: boolean;
  includeInactivePlans?: boolean;
}) {
  const q = options?.q?.trim() ?? "";
  const activeOnly = options?.activeOnly ?? false;

  const rows = await prisma.subscriptionCategory.findMany({
    where: {
      ...(activeOnly ? { isActive: true } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              {
                plans: {
                  some: {
                    planName: { contains: q, mode: "insensitive" },
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      plans: {
        where: activeOnly && !options?.includeInactivePlans ? { isActive: true } : undefined,
        orderBy: [{ isActive: "desc" }, { price: "asc" }, { planName: "asc" }],
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return rows.map(serializeCategory);
}

export async function listActiveCatalogPlans(q?: string) {
  const categories = await listSubscriptionCategories({ q, activeOnly: true });
  return categories.flatMap((category) =>
    category.plans
      .filter((plan) => plan.isActive)
      .map((plan) => ({ ...plan, categoryName: category.name }))
  );
}
