import { prisma } from "@/lib/prisma";
import { toJsonNumber } from "@/lib/serialize-prisma";

export type CatalogPackageItem = {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  price: number;
  description: string | null;
  isActive: boolean;
};

export type CatalogPackageGroup = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  items: CatalogPackageItem[];
  createdAt: string;
  updatedAt: string;
};

export function packageInvoiceDescription(groupName: string, itemTitle: string) {
  return `${groupName} — ${itemTitle}`;
}

function serializeItem(
  row: {
    id: string;
    groupId: string;
    title: string;
    price: unknown;
    description: string | null;
    isActive: boolean;
    group?: { name: string };
  },
  groupName?: string
): CatalogPackageItem {
  return {
    id: row.id,
    groupId: row.groupId,
    groupName: groupName ?? row.group?.name ?? "",
    title: row.title,
    price: toJsonNumber(row.price),
    description: row.description,
    isActive: row.isActive,
  };
}

export function serializePackageGroup(row: {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  items?: Array<{
    id: string;
    groupId: string;
    title: string;
    price: unknown;
    description: string | null;
    isActive: boolean;
  }>;
}): CatalogPackageGroup {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: (row.items ?? []).map((item) =>
      serializeItem({ ...item, group: { name: row.name } })
    ),
  };
}

export async function listPackageGroups(options?: {
  q?: string;
  activeOnly?: boolean;
  includeInactiveItems?: boolean;
}) {
  const q = options?.q?.trim() ?? "";
  const activeOnly = options?.activeOnly ?? false;

  const rows = await prisma.packageGroup.findMany({
    where: {
      ...(activeOnly ? { isActive: true } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              {
                items: {
                  some: { title: { contains: q, mode: "insensitive" } },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      items: {
        where: activeOnly && !options?.includeInactiveItems ? { isActive: true } : undefined,
        orderBy: [{ isActive: "desc" }, { price: "asc" }, { title: "asc" }],
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return rows.map(serializePackageGroup);
}

export async function listActivePackageItems(q?: string) {
  const groups = await listPackageGroups({ q, activeOnly: true });
  return groups.flatMap((group) =>
    group.items
      .filter((item) => item.isActive)
      .map((item) => ({ ...item, groupName: group.name }))
  );
}
