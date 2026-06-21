import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
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
  extractCasualSwimCouponPersistFields,
  getCasualSwimCouponRates,
  getDailyCollectionSheet,
  getPreviousClosingCoupons,
  invalidateCasualSwimReconciliationIfStale,
  parseCollectionDateInput,
} from "@/lib/daily-collection";
import { calculateCasualSwimDualCouponRevenue } from "@/lib/casual-swim-coupon";
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
  lastCouponAbove5: z.number().int().nonnegative(),
  lastCouponBelow5: z.number().int().nonnegative(),
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
  invoiceRevenue?: unknown;
  subscriptionRevenue: unknown;
  productRevenue: unknown;
  casualSwimRevenue?: unknown;
  lastCouponAbove5?: number | null;
  lastCouponBelow5?: number | null;
  casualSwimCouponsAbove5?: number | null;
  casualSwimCouponsBelow5?: number | null;
  casualSwimRevenueAbove5?: unknown;
  casualSwimRevenueBelow5?: unknown;
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
    invoiceRevenue: record.invoiceRevenue != null ? toJsonNumber(record.invoiceRevenue) : null,
    subscriptionRevenue:
      record.subscriptionRevenue != null ? toJsonNumber(record.subscriptionRevenue) : null,
    productRevenue: record.productRevenue != null ? toJsonNumber(record.productRevenue) : null,
    casualSwimRevenue:
      record.casualSwimRevenue != null ? toJsonNumber(record.casualSwimRevenue) : null,
    lastCouponAbove5: record.lastCouponAbove5 ?? null,
    lastCouponBelow5: record.lastCouponBelow5 ?? null,
    casualSwimCouponsAbove5: record.casualSwimCouponsAbove5 ?? null,
    casualSwimCouponsBelow5: record.casualSwimCouponsBelow5 ?? null,
    casualSwimRevenueAbove5:
      record.casualSwimRevenueAbove5 != null ? toJsonNumber(record.casualSwimRevenueAbove5) : null,
    casualSwimRevenueBelow5:
      record.casualSwimRevenueBelow5 != null ? toJsonNumber(record.casualSwimRevenueBelow5) : null,
    totalExpenses: record.totalExpenses != null ? toJsonNumber(record.totalExpenses) : null,
    cashCollectedSystem:
      record.cashCollectedSystem != null ? toJsonNumber(record.cashCollectedSystem) : null,
    upiCollected: record.upiCollected != null ? toJsonNumber(record.upiCollected) : null,
    netCollection: record.netCollection != null ? toJsonNumber(record.netCollection) : null,
    cashCountedPhysical:
      record.cashCountedPhysical != null ? toJsonNumber(record.cashCountedPhysical) : null,
    cashDifference: record.cashDifference != null ? toJsonNumber(record.cashDifference) : null,
    cashDifferenceNotes: record.cashDifferenceNotes,
    cashDenominations: (record.cashDenominations ?? null) as Prisma.InputJsonValue | null,
  };
}

async function validateCouponInput(date: Date, lastAbove5: number, lastBelow5: number) {
  const previous = await getPreviousClosingCoupons(date);
  const rates = await getCasualSwimCouponRates();
  return calculateCasualSwimDualCouponRevenue({
    previousAbove5: previous.above5,
    previousBelow5: previous.below5,
    lastCouponAbove5: lastAbove5,
    lastCouponBelow5: lastBelow5,
    adultCouponRate: rates.adultRate,
    childCouponRate: rates.childRate,
  });
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

    const couponCalc = await validateCouponInput(
      collectionDate,
      parsed.data.lastCouponAbove5,
      parsed.data.lastCouponBelow5
    );
    if (!couponCalc.ok) {
      return NextResponse.json({ error: couponCalc.message }, { status: 400 });
    }

    await invalidateCasualSwimReconciliationIfStale(collectionDate, couponCalc.result.revenue);

    const existing = await prisma.dailyCollection.findUnique({
      where: { collectionDate },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Collection for this date has already been marked" },
        { status: 409 }
      );
    }

    const sheet = await getDailyCollectionSheet(parsed.data.date, {
      preferLiveTotals: true,
      lastCouponAbove5: parsed.data.lastCouponAbove5,
      lastCouponBelow5: parsed.data.lastCouponBelow5,
    });
    if (!sheet) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const snapshot = buildCollectionSnapshotFromSheet(sheet);
    const couponFields = extractCasualSwimCouponPersistFields(sheet.casualSwim);
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
        invoiceRevenue: snapshot.invoiceRevenue,
        subscriptionRevenue: snapshot.subscriptionRevenue,
        productRevenue: snapshot.productRevenue,
        ...couponFields,
        totalExpenses: snapshot.totalExpenses,
        cashCollectedSystem: cash.cashCollectedSystem,
        upiCollected: snapshot.upiCollected,
        netCollection: snapshot.netCollection,
        cashCountedPhysical: cash.cashCountedPhysical,
        cashDifference: cash.cashDifference,
        cashDifferenceNotes: cash.cashDifferenceNotes,
        cashDenominations: cash.cashDenominations,
        originalSnapshotJson: buildOriginalSnapshotJson({
          ...extractCollectionDiffValues({
            notes: parsed.data.notes?.trim() || null,
            collectedByName,
            totalRevenue: snapshot.totalRevenue,
            invoiceRevenue: snapshot.invoiceRevenue,
            subscriptionRevenue: snapshot.subscriptionRevenue,
            productRevenue: snapshot.productRevenue,
            casualSwimRevenue: couponFields.casualSwimRevenue,
            lastCouponAbove5: couponFields.lastCouponAbove5,
            lastCouponBelow5: couponFields.lastCouponBelow5,
            casualSwimCouponsAbove5: couponFields.casualSwimCouponsAbove5,
            casualSwimCouponsBelow5: couponFields.casualSwimCouponsBelow5,
            casualSwimRevenueAbove5: couponFields.casualSwimRevenueAbove5,
            casualSwimRevenueBelow5: couponFields.casualSwimRevenueBelow5,
            totalExpenses: snapshot.totalExpenses,
            cashCollectedSystem: cash.cashCollectedSystem,
            upiCollected: snapshot.upiCollected,
            netCollection: snapshot.netCollection,
            cashCountedPhysical: cash.cashCountedPhysical,
            cashDifference: cash.cashDifference,
            cashDifferenceNotes: cash.cashDifferenceNotes,
          }),
          cardCollected: snapshot.cardCollected ?? null,
          otherCollected: snapshot.otherCollected ?? null,
        }),
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
        ...couponFields,
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

    const couponCalc = await validateCouponInput(
      collectionDate,
      parsed.data.lastCouponAbove5,
      parsed.data.lastCouponBelow5
    );
    if (!couponCalc.ok) {
      return NextResponse.json({ error: couponCalc.message }, { status: 400 });
    }

    await invalidateCasualSwimReconciliationIfStale(collectionDate, couponCalc.result.revenue);

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

    const sheet = await getDailyCollectionSheet(parsed.data.date, {
      preferLiveTotals: true,
      lastCouponAbove5: parsed.data.lastCouponAbove5,
      lastCouponBelow5: parsed.data.lastCouponBelow5,
    });
    if (!sheet) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const snapshot = buildCollectionSnapshotFromSheet(sheet);
    const couponFields = extractCasualSwimCouponPersistFields(sheet.casualSwim);
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
      invoiceRevenue: snapshot.invoiceRevenue,
      subscriptionRevenue: snapshot.subscriptionRevenue,
      productRevenue: snapshot.productRevenue,
      casualSwimRevenue: couponFields.casualSwimRevenue,
      lastCouponAbove5: couponFields.lastCouponAbove5,
      lastCouponBelow5: couponFields.lastCouponBelow5,
      casualSwimCouponsAbove5: couponFields.casualSwimCouponsAbove5,
      casualSwimCouponsBelow5: couponFields.casualSwimCouponsBelow5,
      casualSwimRevenueAbove5: couponFields.casualSwimRevenueAbove5,
      casualSwimRevenueBelow5: couponFields.casualSwimRevenueBelow5,
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
          invoiceRevenue: snapshot.invoiceRevenue,
          subscriptionRevenue: snapshot.subscriptionRevenue,
          productRevenue: snapshot.productRevenue,
          ...couponFields,
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

    void logAuditEvent({
      userId: user!.id,
      username: user!.username,
      action: AUDIT_ACTIONS.DAILY_COLLECTION_UPDATED,
      entityType: "DAILY_COLLECTION",
      entityId: record.id,
      details: {
        date: parsed.data.date,
        previousValues: serializeCollectionAuditValues(existing),
        newValues: serializeCollectionAuditValues(record),
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
