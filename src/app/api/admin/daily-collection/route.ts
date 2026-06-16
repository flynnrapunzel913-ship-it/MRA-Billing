import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { AUDIT_ACTIONS, logAuditEvent } from "@/lib/audit-log";
import { format } from "date-fns";
import {
  buildCollectionChangesJson,
  buildOriginalSnapshotJson,
  extractCollectionDiffValues,
  hasCollectionChanges,
} from "@/lib/daily-collection-diff";
import {
  buildCollectionSnapshotFromSheet,
  getDailyCollectionSheet,
  parseCollectionDateInput,
} from "@/lib/daily-collection";
import {
  calculateCashDifference,
  calculatePhysicalCash,
  normalizeDenominations,
} from "@/lib/cash-denominations";
import { toJsonNumber } from "@/lib/serialize-prisma";

const bodySchema = z.object({
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  collectedByName: z.string().trim().min(1, "Collected by name is required").optional(),
  cashDenominations: z.record(z.string(), z.number().int().nonnegative()).optional(),
  cashDifferenceNotes: z.string().optional(),
});

async function resolveCashReconciliation(
  sheet: Awaited<ReturnType<typeof getDailyCollectionSheet>>,
  denominationsInput: unknown,
  cashDifferenceNotes?: string | null,
  systemCashOverride?: number | null
) {
  const cashCollectedSystem =
    systemCashOverride ?? sheet?.paymentBreakdown.netCash ?? 0;
  const cashDenominations = normalizeDenominations(denominationsInput);
  const cashCountedPhysical = calculatePhysicalCash(cashDenominations);
  const cashDifference = calculateCashDifference(cashCountedPhysical, cashCollectedSystem);

  return {
    cashCollectedSystem,
    cashCountedPhysical,
    cashDifference,
    cashDifferenceNotes: cashDifferenceNotes?.trim() || null,
    cashDenominations,
  };
}

function auditCashDetails(cash: Awaited<ReturnType<typeof resolveCashReconciliation>>) {
  return {
    systemCash: cash.cashCollectedSystem,
    physicalCash: cash.cashCountedPhysical,
    difference: cash.cashDifference,
  };
}

function serializeCollectionAuditValues(record: {
  notes: string | null;
  collectedByName: string | null;
  totalRevenue: unknown;
  subscriptionRevenue: unknown;
  productRevenue: unknown;
  totalExpenses: unknown;
  cashCollectedSystem: unknown;
  upiCollected: unknown;
  netCollection: unknown;
  cashCountedPhysical: unknown;
  cashDifference: unknown;
  cashDifferenceNotes: string | null;
  cashDenominations: unknown;
}) {
  return {
    notes: record.notes,
    collectedByName: record.collectedByName,
    totalRevenue: record.totalRevenue != null ? toJsonNumber(record.totalRevenue) : null,
    subscriptionRevenue:
      record.subscriptionRevenue != null ? toJsonNumber(record.subscriptionRevenue) : null,
    productRevenue: record.productRevenue != null ? toJsonNumber(record.productRevenue) : null,
    totalExpenses: record.totalExpenses != null ? toJsonNumber(record.totalExpenses) : null,
    cashCollectedSystem:
      record.cashCollectedSystem != null ? toJsonNumber(record.cashCollectedSystem) : null,
    upiCollected: record.upiCollected != null ? toJsonNumber(record.upiCollected) : null,
    netCollection: record.netCollection != null ? toJsonNumber(record.netCollection) : null,
    cashCountedPhysical:
      record.cashCountedPhysical != null ? toJsonNumber(record.cashCountedPhysical) : null,
    cashDifference: record.cashDifference != null ? toJsonNumber(record.cashDifference) : null,
    cashDifferenceNotes: record.cashDifferenceNotes,
    cashDenominations: record.cashDenominations,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const dateStr = request.nextUrl.searchParams.get("date") || format(new Date(), "yyyy-MM-dd");
    const preferLiveTotals = request.nextUrl.searchParams.get("live") === "1";

    const sheet = await getDailyCollectionSheet(dateStr, { preferLiveTotals });
    if (!sheet) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    return NextResponse.json(sheet);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load daily collection");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAdmin();
    if (error) return error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const collectionDate = parseCollectionDateInput(parsed.data.date);
    if (!collectionDate) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const existing = await prisma.dailyCollection.findUnique({
      where: { collectionDate },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Collection for this date has already been marked" },
        { status: 409 }
      );
    }

    const sheet = await getDailyCollectionSheet(parsed.data.date, { preferLiveTotals: true });
    if (!sheet) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const snapshot = buildCollectionSnapshotFromSheet(sheet);
    const cash = await resolveCashReconciliation(
      sheet,
      parsed.data.cashDenominations,
      parsed.data.cashDifferenceNotes
    );

    const collectedByName =
      parsed.data.collectedByName?.trim() ||
      user!.name?.trim() ||
      user!.username?.trim() ||
      "Admin";

    const record = await prisma.dailyCollection.create({
      data: {
        collectionDate,
        notes: parsed.data.notes?.trim() || null,
        collectedAt: new Date(),
        collectedByUserId: user!.id!,
        collectedByName,
        totalRevenue: snapshot.totalRevenue,
        subscriptionRevenue: snapshot.subscriptionRevenue,
        productRevenue: snapshot.productRevenue,
        totalExpenses: snapshot.totalExpenses,
        cashCollectedSystem: cash.cashCollectedSystem,
        upiCollected: snapshot.upiCollected,
        netCollection: snapshot.netCollection,
        cashCountedPhysical: cash.cashCountedPhysical,
        cashDifference: cash.cashDifference,
        cashDifferenceNotes: cash.cashDifferenceNotes,
        cashDenominations: cash.cashDenominations,
        originalSnapshotJson: buildOriginalSnapshotJson(
          extractCollectionDiffValues({
            notes: parsed.data.notes?.trim() || null,
            collectedByName,
            totalRevenue: snapshot.totalRevenue,
            subscriptionRevenue: snapshot.subscriptionRevenue,
            productRevenue: snapshot.productRevenue,
            totalExpenses: snapshot.totalExpenses,
            cashCollectedSystem: cash.cashCollectedSystem,
            upiCollected: snapshot.upiCollected,
            netCollection: snapshot.netCollection,
            cashCountedPhysical: cash.cashCountedPhysical,
            cashDifference: cash.cashDifference,
            cashDifferenceNotes: cash.cashDifferenceNotes,
          })
        ),
      },
      include: {
        collectedBy: { select: { id: true, name: true, username: true } },
      },
    });

    void logAuditEvent({
      userId: user!.id,
      username: user!.username,
      action: AUDIT_ACTIONS.DAILY_COLLECTION_MARKED,
      entityType: "DAILY_COLLECTION",
      entityId: record.id,
      details: {
        date: parsed.data.date,
        notes: record.notes,
        ...snapshot,
        ...auditCashDetails(cash),
      },
    });

    return NextResponse.json(
      {
        id: record.id,
        notes: record.notes,
        collectedAt: record.collectedAt.toISOString(),
        collectedBy: record.collectedBy,
      },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Failed to mark daily collection");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, user } = await requireAdmin();
    if (error) return error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const collectionDate = parseCollectionDateInput(parsed.data.date);
    if (!collectionDate) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const existing = await prisma.dailyCollection.findUnique({
      where: { collectionDate },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "No collection record exists for this date" },
        { status: 404 }
      );
    }

    const beforeValues = extractCollectionDiffValues(existing);

    const sheet = await getDailyCollectionSheet(parsed.data.date, { preferLiveTotals: true });
    if (!sheet) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const snapshot = buildCollectionSnapshotFromSheet(sheet);
    const cash = await resolveCashReconciliation(
      sheet,
      parsed.data.cashDenominations,
      parsed.data.cashDifferenceNotes
    );

    const collectedByName =
      parsed.data.collectedByName?.trim() ||
      existing.collectedByName ||
      user!.name?.trim() ||
      user!.username?.trim() ||
      "Admin";

    const afterValues = extractCollectionDiffValues({
      notes: parsed.data.notes?.trim() || null,
      collectedByName,
      totalRevenue: snapshot.totalRevenue,
      subscriptionRevenue: snapshot.subscriptionRevenue,
      productRevenue: snapshot.productRevenue,
      totalExpenses: snapshot.totalExpenses,
      cashCollectedSystem: cash.cashCollectedSystem,
      upiCollected: snapshot.upiCollected,
      netCollection: snapshot.netCollection,
      cashCountedPhysical: cash.cashCountedPhysical,
      cashDifference: cash.cashDifference,
      cashDifferenceNotes: cash.cashDifferenceNotes,
    });

    const changesJson = buildCollectionChangesJson(beforeValues, afterValues);

    const record = await prisma.$transaction(async (tx) => {
      const updated = await tx.dailyCollection.update({
        where: { id: existing.id },
        data: {
          notes: parsed.data.notes?.trim() || null,
          collectedByName,
          totalRevenue: snapshot.totalRevenue,
          subscriptionRevenue: snapshot.subscriptionRevenue,
          productRevenue: snapshot.productRevenue,
          totalExpenses: snapshot.totalExpenses,
          cashCollectedSystem: cash.cashCollectedSystem,
          upiCollected: snapshot.upiCollected,
          netCollection: snapshot.netCollection,
          cashCountedPhysical: cash.cashCountedPhysical,
          cashDifference: cash.cashDifference,
          cashDifferenceNotes: cash.cashDifferenceNotes,
          cashDenominations: cash.cashDenominations,
        },
        include: {
          collectedBy: { select: { id: true, name: true, username: true } },
        },
      });

      if (hasCollectionChanges(changesJson)) {
        await tx.dailyCollectionHistory.create({
          data: {
            dailyCollectionId: existing.id,
            editedById: user!.id!,
            changesJson,
          },
        });
      }

      return updated;
    });

    const previousValues = serializeCollectionAuditValues(existing);

    const newValues = serializeCollectionAuditValues(record);

    void logAuditEvent({
      userId: user!.id,
      username: user!.username,
      action: AUDIT_ACTIONS.DAILY_COLLECTION_UPDATED,
      entityType: "DAILY_COLLECTION",
      entityId: record.id,
      details: {
        date: parsed.data.date,
        previousValues,
        newValues,
        ...(hasCollectionChanges(changesJson) ? { changes: changesJson } : {}),
      },
    });

    return NextResponse.json({
      id: record.id,
      notes: record.notes,
      collectedAt: record.collectedAt.toISOString(),
      collectedBy: record.collectedBy,
      ...(hasCollectionChanges(changesJson)
        ? { historyRecorded: true }
        : { historyRecorded: false }),
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to update daily collection");
  }
}
