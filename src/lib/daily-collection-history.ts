import type { Prisma } from "@prisma/client";
import {
  COLLECTION_FIELD_LABELS,
  type CollectionChangesJson,
  type CollectionDiffValues,
  type OriginalSnapshotJson,
} from "@/lib/daily-collection-diff";

export type CollectionVersionOriginal = {
  version: 0;
  type: "original";
  createdAt: string;
  editedBy: { id: string; name: string; username: string };
  snapshot: OriginalSnapshotJson;
};

export type CollectionVersionEdit = {
  version: number;
  type: "edit";
  createdAt: string;
  editedBy: { id: string; name: string; username: string };
  changes: CollectionChangesJson;
};

export type CollectionVersionEntry = CollectionVersionOriginal | CollectionVersionEdit;

export type DailyCollectionVersionHistoryResponse = {
  dailyCollectionId: string;
  lastEditedAt: string | null;
  versions: CollectionVersionEntry[];
};

function parseOriginalSnapshot(value: Prisma.JsonValue | null): OriginalSnapshotJson | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as OriginalSnapshotJson;
}

function parseChangesJson(value: Prisma.JsonValue): CollectionChangesJson {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as CollectionChangesJson;
}

export function buildVersionHistoryResponse(input: {
  dailyCollectionId: string;
  collectedAt: Date;
  collectedBy: { id: string; name: string; username: string };
  originalSnapshotJson: Prisma.JsonValue | null;
  fallbackSnapshot: CollectionDiffValues;
  historyRows: Array<{
    id: string;
    createdAt: Date;
    changesJson: Prisma.JsonValue;
    editedBy: { id: string; name: string; username: string };
  }>;
}): DailyCollectionVersionHistoryResponse {
  const parsedOriginal = parseOriginalSnapshot(input.originalSnapshotJson);
  const version0Snapshot: OriginalSnapshotJson = parsedOriginal ?? {
    totalRevenue: input.fallbackSnapshot.totalRevenue,
    totalExpenses: input.fallbackSnapshot.totalExpenses,
    cashCollected: input.fallbackSnapshot.cashCollected,
    upiCollected: input.fallbackSnapshot.upiCollected,
    netCollection: input.fallbackSnapshot.netCollection,
    subscriptionRevenue: input.fallbackSnapshot.subscriptionRevenue,
    productRevenue: input.fallbackSnapshot.productRevenue,
    notes: input.fallbackSnapshot.notes,
    collectedByName: input.fallbackSnapshot.collectedByName,
  };

  const versions: CollectionVersionEntry[] = [
    {
      version: 0,
      type: "original",
      createdAt: input.collectedAt.toISOString(),
      editedBy: input.collectedBy,
      snapshot: version0Snapshot,
    },
  ];

  const sorted = [...input.historyRows].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  sorted.forEach((row, index) => {
    versions.push({
      version: index + 1,
      type: "edit",
      createdAt: row.createdAt.toISOString(),
      editedBy: row.editedBy,
      changes: parseChangesJson(row.changesJson),
    });
  });

  const lastEditedAt =
    sorted.length > 0 ? sorted[sorted.length - 1]!.createdAt.toISOString() : null;

  return {
    dailyCollectionId: input.dailyCollectionId,
    lastEditedAt,
    versions,
  };
}

export { COLLECTION_FIELD_LABELS };
