import { NextRequest, NextResponse } from "next/server";
import { endOfDay, format, startOfDay } from "date-fns";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireCasualSwimAccess } from "@/lib/auth/guards";
import { AUDIT_ACTIONS, logAuditEvent } from "@/lib/audit-log";
import {
  allocateCasualSwimTicketNumber,
  calculateCasualSwimBill,
  getCasualSwimRates,
} from "@/lib/casual-swim";
import { serializeCasualSwimBill } from "@/lib/casual-swim-bill";
import { toJsonNumber } from "@/lib/serialize-prisma";
import { casualSwimBillSchema } from "@/lib/validations";
import { resolveCasualSwimPayment } from "@/lib/casual-swim-payment";

const billInclude = {
  createdBy: { select: { id: true, name: true, username: true } },
} as const;

export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireCasualSwimAccess();
    if (error) return error;

    const today = format(new Date(), "yyyy-MM-dd");
    const dateStr =
      user!.role === Role.CASHIER
        ? today
        : request.nextUrl.searchParams.get("date") || today;
    const dayStart = startOfDay(new Date(`${dateStr}T00:00:00`));
    const dayEnd = endOfDay(dayStart);

    const bills = await prisma.casualSwimBill.findMany({
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
      orderBy: { ticketNumber: "desc" },
      include: billInclude,
    });

    return NextResponse.json({
      date: dateStr,
      bills: bills.map(serializeCasualSwimBill),
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load casual swim bills");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireCasualSwimAccess();
    if (error) return error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = casualSwimBillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const rates = await getCasualSwimRates();
    const breakdown = calculateCasualSwimBill(parsed.data, rates);

    if (breakdown.totalAmount <= 0) {
      return NextResponse.json({ error: "Total amount must be greater than zero" }, { status: 400 });
    }

    const paymentResult = resolveCasualSwimPayment(
      {
        paymentMode: parsed.data.paymentMode,
        cashAmount: parsed.data.cashAmount,
        upiAmount: parsed.data.upiAmount,
      },
      breakdown.totalAmount
    );
    if (!paymentResult.ok) {
      return NextResponse.json({ error: paymentResult.message }, { status: 400 });
    }
    const payment = paymentResult.payment;

    const bill = await prisma.$transaction(async (tx) => {
      const ticketNumber = await allocateCasualSwimTicketNumber(tx);

      return tx.casualSwimBill.create({
        data: {
          ticketNumber,
          hours: parsed.data.hours,
          adultCount: parsed.data.adultCount,
          childCount: parsed.data.childCount,
          capQty: parsed.data.capQty,
          shortsQty: parsed.data.shortsQty,
          gogglesQty: parsed.data.gogglesQty,
          adultRate: rates.adultRatePerHour,
          childRate: rates.childRatePerHour,
          capRate: rates.capRentalPrice,
          shortsRate: rates.shortsRentalPrice,
          gogglesRate: rates.gogglesRentalPrice,
          swimmingAmount: breakdown.swimmingAmount,
          rentalAmount: breakdown.rentalAmount,
          totalAmount: breakdown.totalAmount,
          paymentMode: payment.paymentMode,
          cashAmount: payment.cashAmount,
          upiAmount: payment.upiAmount,
          createdById: user!.id!,
        },
        include: billInclude,
      });
    });

    void logAuditEvent({
      userId: user!.id,
      username: user!.username,
      action: AUDIT_ACTIONS.CASUAL_SWIM_TICKET_CREATED,
      entityType: "CASUAL_SWIM_BILL",
      entityId: bill.id,
      details: {
        ticketNumber: bill.ticketNumber,
        totalAmount: toJsonNumber(bill.totalAmount),
        paymentMode: bill.paymentMode,
        cashAmount: toJsonNumber(bill.cashAmount),
        upiAmount: toJsonNumber(bill.upiAmount),
        cashier: user!.username,
      },
    });

    return NextResponse.json(serializeCasualSwimBill(bill), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Failed to create casual swim bill");
  }
}
