import type { PricingSection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toJsonNumber } from "@/lib/serialize-prisma";

export type PricingRow = {
  id: string;
  section: PricingSection;
  label: string;
  price: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PricingSectionGroup = {
  section: PricingSection;
  title: string;
  addLabel: string;
  labelField: string;
  items: PricingRow[];
};

export const PRICING_SECTION_META: Record<
  PricingSection,
  { title: string; addLabel: string; labelField: string; labelPlaceholder: string }
> = {
  MONTHLY_PACKAGE: {
    title: "Monthly Package (Without Coaching)",
    addLabel: "Add Duration",
    labelField: "Duration Label",
    labelPlaceholder: "1 Month",
  },
  COACHING_PACKAGE: {
    title: "Basic Coaching Package",
    addLabel: "Add Coaching Package",
    labelField: "Package Name",
    labelPlaceholder: "21 Classes Within 30 Days",
  },
  CASUAL_SWIMMING: {
    title: "Casual Swimming",
    addLabel: "Add Casual Rate",
    labelField: "Title",
    labelPlaceholder: "Adult Per Hour",
  },
};

export const PRICING_SECTION_ORDER: PricingSection[] = [
  "MONTHLY_PACKAGE",
  "COACHING_PACKAGE",
  "CASUAL_SWIMMING",
];

/** Build display label for monthly package from month count. */
export function monthlyPackageLabel(months: number): string {
  if (months === 12) return "1 Year";
  if (months === 1) return "1 Month";
  return `${months} Months`;
}

/** Parse month count from a monthly package label when editing. */
export function parseMonthsFromMonthlyLabel(label: string): number | null {
  const trimmed = label.trim().toLowerCase();
  if (trimmed === "1 year") return 12;
  if (trimmed === "1 month") return 1;
  const match = trimmed.match(/^(\d+)\s*months?$/);
  if (match) return Number(match[1]);
  return null;
}

export function sectionTitle(section: PricingSection | string): string {
  const key = section as PricingSection;
  return PRICING_SECTION_META[key]?.title ?? String(section);
}

export function pricingInvoiceDescription(section: PricingSection | string, label: string) {
  return `${sectionTitle(section)} — ${label}`;
}

export function serializePricingRow(row: {
  id: string;
  section: PricingSection;
  label: string;
  price: unknown;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PricingRow {
  return {
    id: row.id,
    section: row.section,
    label: row.label,
    price: toJsonNumber(row.price),
    description: row.description,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function groupPricingBySection(rows: PricingRow[]): PricingSectionGroup[] {
  const bySection = new Map<PricingSection, PricingRow[]>();
  for (const section of PRICING_SECTION_ORDER) {
    bySection.set(section, []);
  }
  for (const row of rows) {
    const list = bySection.get(row.section) ?? [];
    list.push(row);
    bySection.set(row.section, list);
  }

  return PRICING_SECTION_ORDER.map((section) => {
    const meta = PRICING_SECTION_META[section];
    const items = (bySection.get(section) ?? []).sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.price - b.price || a.label.localeCompare(b.label);
    });
    return {
      section,
      title: meta.title,
      addLabel: meta.addLabel,
      labelField: meta.labelField,
      items,
    };
  });
}

export async function listSubscriptionPricing(options?: {
  q?: string;
  activeOnly?: boolean;
  section?: PricingSection;
}) {
  const q = options?.q?.trim() ?? "";

  const rows = await prisma.subscriptionPricing.findMany({
    where: {
      ...(options?.activeOnly ? { isActive: true } : {}),
      ...(options?.section ? { section: options.section } : {}),
      ...(q
        ? {
            OR: [
              { label: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ section: "asc" }, { isActive: "desc" }, { price: "asc" }, { label: "asc" }],
  });

  return rows.map(serializePricingRow);
}

export async function listPricingCatalog(options?: { q?: string; activeOnly?: boolean }) {
  const rows = await listSubscriptionPricing({ ...options, activeOnly: options?.activeOnly ?? true });
  return groupPricingBySection(rows);
}
