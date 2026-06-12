import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { AUDIT_ACTIONS, logAuditEvent } from "@/lib/audit-log";
import { format } from "date-fns";
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

const bodySchema = z.object({
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  collectedByName: z.string().trim().min(1, "Collected by name is required").optional(),
  cashDenominations: z.record(z.string(), z.number().int().nonnegative()).optional(),
  cashDifferenceNotes: z.string().optional(),
});

async function resolveCashReconciliation(
  dateStr: string,
  denominationsInput: unknown,
  cashDifferenceNotes?: string | null,
  systemCashOverride?: number | null
) {
  const sheet = await getDailyCollectionSheet(dateStr);
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

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const dateStr = request.nextUrl.searchParams.get("date") || format(new Date(), "yyyy-MM-dd");

    const sheet = await getDailyCollectionSheet(dateStr);
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

    const sheet = await getDailyCollectionSheet(parsed.data.date);
    if (!sheet) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const snapshot = buildCollectionSnapshotFromSheet(sheet);
    const cash = await resolveCashReconciliation(
      parsed.data.date,
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
    const { error } = await requireAdmin();
    if (error) return error;

    return NextResponse.json(
      { error: "This day's collection is locked and cannot be changed" },
      { status: 409 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Failed to update daily collection");
  }
}
