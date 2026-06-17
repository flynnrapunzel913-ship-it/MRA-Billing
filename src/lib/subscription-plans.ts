import { prisma } from "@/lib/prisma";
import { toJsonNumber } from "@/lib/serialize-prisma";
import { casualSubscriptionExclusionFilter } from "@/lib/casual-subscription-exclusions";
import {
  formatDurationLabel,
  formatPlanCoverageSummary,
  type SubscriptionDurationUnit,
} from "@/lib/subscription-duration";

export type SubscriptionPlanRow = {
  id: string;
  planName: string;
  description: string | null;
  duration: string;
  durationValue: number;
  durationUnit: SubscriptionDurationUnit;
  usageDays: number | null;
  fees: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function planInvoiceDescription(plan: {
  planName: string;
  description?: string | null;
  usageDays?: number | null;
  durationValue: number;
  durationUnit: SubscriptionDurationUnit;
}) {
  const parts = [plan.planName.trim()];
  if (plan.description?.trim()) parts.push(plan.description.trim());
  parts.push(`(${formatPlanCoverageSummary(plan)})`);
  return parts.join(" — ");
}

export function serializeSubscriptionPlan(row: {
  id: string;
  planName: string;
  description: string | null;
  duration: string;
  durationValue: number;
  durationUnit: SubscriptionDurationUnit;
  usageDays: number | null;
  fees: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SubscriptionPlanRow {
  return {
    id: row.id,
    planName: row.planName,
    description: row.description,
    duration: row.duration,
    durationValue: row.durationValue,
    durationUnit: row.durationUnit,
    usageDays: row.usageDays,
    fees: toJsonNumber(row.fees),
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listSubscriptionPlans(options?: { q?: string; activeOnly?: boolean }) {
  const q = options?.q?.trim() ?? "";

  const rows = await prisma.subscriptionPlan.findMany({
    where: {
      ...casualSubscriptionExclusionFilter(),
      ...(options?.activeOnly ? { isActive: true } : {}),
      ...(q
        ? {
            OR: [
              { planName: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { duration: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ isActive: "desc" }, { planName: "asc" }],
  });

  return rows.map(serializeSubscriptionPlan);
}
