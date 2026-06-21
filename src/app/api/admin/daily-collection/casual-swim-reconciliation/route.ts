import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { AUDIT_ACTIONS, logAuditEvent } from "@/lib/audit-log";
import {
  buildCollectionChangesJson,
  extractCollectionDiffValues,
  hasCollectionChanges,
} from "@/lib/daily-collection-diff";
import {
  buildCollectionSnapshotFromSheet,
  getCasualSwimCouponRates,
  getDailyCollectionSheet,
  getPreviousClosingCoupons,
  parseCollectionDateInput,
  resolveCasualSwimDualCouponTracking,
} from "@/lib/daily-collection";
import { calculateCasualSwimDualCouponRevenue } from "@/lib/casual-swim-coupon";
import { validateCasualSwimReconciliation } from "@/lib/casual-swim-reconciliation";
import { toJsonNumber } from "@/lib/serialize-prisma";

const bodySchema = z.object({
  date: z.string().min(1, "Date is required"),
  cashAmount: z.number().nonnegative(),
  upiAmount: z.number().nonnegative(),
  lastCouponAbove5: z.number().int().nonnegative().optional(),
  lastCouponBelow5: z.number().int().nonnegative().optional(),
});

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

    const [previousClosing, rates, existingReconciliation, dailyCollection] = await Promise.all([
      getPreviousClosingCoupons(collectionDate),
      getCasualSwimCouponRates(),
      prisma.casualSwimReconciliation.findUnique({ where: { collectionDate } }),
      prisma.dailyCollection.findUnique({ where: { collectionDate } }),
    ]);

    const lastAbove5 =
      dailyCollection?.lastCouponAbove5 ?? parsed.data.lastCouponAbove5 ?? null;
    const lastBelow5 =
      dailyCollection?.lastCouponBelow5 ?? parsed.data.lastCouponBelow5 ?? null;

    if (lastAbove5 == null || lastBelow5 == null) {
      return NextResponse.json(
        {
          error:
            "Enter today's last coupon numbers (Above 5 and Below 5 Years) before reconciling.",
        },
        { status: 400 }
      );
    }

    const couponCalc = calculateCasualSwimDualCouponRevenue({
      previousAbove5: previousClosing.above5,
      previousBelow5: previousClosing.below5,
      lastCouponAbove5: lastAbove5,
      lastCouponBelow5: lastBelow5,
      adultCouponRate: rates.adultRate,
      childCouponRate: rates.childRate,
    });
    if (!couponCalc.ok) {
      return NextResponse.json({ error: couponCalc.message }, { status: 400 });
    }

    const casualSwim = couponCalc.result;

    if (casualSwim.revenue <= 0) {
      return NextResponse.json(
        { error: "Casual swimming revenue must be greater than zero to reconcile." },
        { status: 400 }
      );
    }

    const validation = validateCasualSwimReconciliation({
      totalRevenue: casualSwim.revenue,
      cashAmount: parsed.data.cashAmount,
      upiAmount: parsed.data.upiAmount,
    });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    const reconciledByName = user!.name?.trim() || user!.username?.trim() || "Admin";
    const isUpdate = existingReconciliation != null;

    const record = await prisma.casualSwimReconciliation.upsert({
      where: { collectionDate },
      create: {
        collectionDate,
        cashAmount: parsed.data.cashAmount,
        upiAmount: parsed.data.upiAmount,
        casualSwimTotal: casualSwim.revenue,
        lastCouponAbove5: lastAbove5,
        lastCouponBelow5: lastBelow5,
        reconciledAt: new Date(),
        reconciledByUserId: user!.id!,
        reconciledByName,
      },
      update: {
        cashAmount: parsed.data.cashAmount,
        upiAmount: parsed.data.upiAmount,
        casualSwimTotal: casualSwim.revenue,
        lastCouponAbove5: lastAbove5,
        lastCouponBelow5: lastBelow5,
        reconciledAt: new Date(),
        reconciledByUserId: user!.id!,
        reconciledByName,
      },
      include: {
        reconciledBy: { select: { id: true, name: true, username: true } },
      },
    });

    if (dailyCollection) {
      const beforeValues = extractCollectionDiffValues(dailyCollection);
      const sheet = await getDailyCollectionSheet(parsed.data.date, {
        preferLiveTotals: true,
        lastCouponAbove5: lastAbove5,
        lastCouponBelow5: lastBelow5,
      });

      if (sheet) {
        const snapshot = buildCollectionSnapshotFromSheet(sheet);
        const afterValues = extractCollectionDiffValues({
          ...dailyCollection,
          totalRevenue: snapshot.totalRevenue,
          invoiceRevenue: snapshot.invoiceRevenue,
          cashCollectedSystem: snapshot.cashCollected,
          upiCollected: snapshot.upiCollected,
          netCollection: snapshot.netCollection,
          casualSwimCashCollected: parsed.data.cashAmount,
          casualSwimUpiCollected: parsed.data.upiAmount,
        });

        const changesJson = buildCollectionChangesJson(beforeValues, afterValues);

        await prisma.$transaction(async (tx) => {
          await tx.dailyCollection.update({
            where: { id: dailyCollection.id },
            data: {
              totalRevenue: snapshot.totalRevenue,
              cashCollectedSystem: snapshot.cashCollected,
              upiCollected: snapshot.upiCollected,
              netCollection: snapshot.netCollection,
              casualSwimCashCollected: parsed.data.cashAmount,
              casualSwimUpiCollected: parsed.data.upiAmount,
            },
          });

          if (hasCollectionChanges(changesJson)) {
            await tx.dailyCollectionHistory.create({
              data: {
                dailyCollectionId: dailyCollection.id,
                editedById: user!.id!,
                changesJson,
              },
            });
          }
        });
      }
    }

    void logAuditEvent({
      userId: user!.id,
      username: user!.username,
      action: isUpdate
        ? AUDIT_ACTIONS.CASUAL_SWIM_RECONCILIATION_UPDATED
        : AUDIT_ACTIONS.CASUAL_SWIM_RECONCILIED,
      entityType: "CASUAL_SWIM_RECONCILIATION",
      entityId: record.id,
      details: {
        date: parsed.data.date,
        adultRevenue: casualSwim.above5.revenue,
        childRevenue: casualSwim.below5.revenue,
        totalRevenue: casualSwim.revenue,
        cashAmount: parsed.data.cashAmount,
        upiAmount: parsed.data.upiAmount,
        user: reconciledByName,
        timestamp: record.reconciledAt.toISOString(),
      },
    });

    return NextResponse.json({
      id: record.id,
      date: parsed.data.date,
      cashAmount: toJsonNumber(record.cashAmount),
      upiAmount: toJsonNumber(record.upiAmount),
      casualSwimTotal: toJsonNumber(record.casualSwimTotal),
      reconciledAt: record.reconciledAt.toISOString(),
      reconciledByName: record.reconciledByName,
      reconciledBy: record.reconciledBy,
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to save casual swimming reconciliation");
  }
}
