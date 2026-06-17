import type { CasualSwimBillStatus } from "@prisma/client";
import { toJsonNumber } from "@/lib/serialize-prisma";

export type CasualSwimBillDto = {
  id: string;
  ticketNumber: number;
  hours: number;
  adultCount: number;
  childCount: number;
  capQty: number;
  shortsQty: number;
  gogglesQty: number;
  adultRate: number;
  childRate: number;
  capRate: number;
  shortsRate: number;
  gogglesRate: number;
  swimmingAmount: number;
  rentalAmount: number;
  totalAmount: number;
  status: CasualSwimBillStatus;
  createdAt: string;
  createdBy: string;
  createdByUsername: string;
  createdById: string;
};

export function serializeCasualSwimBill(row: {
  id: string;
  ticketNumber: number;
  hours: number;
  adultCount: number;
  childCount: number;
  capQty: number;
  shortsQty: number;
  gogglesQty: number;
  adultRate: unknown;
  childRate: unknown;
  capRate: unknown;
  shortsRate: unknown;
  gogglesRate: unknown;
  swimmingAmount: unknown;
  rentalAmount: unknown;
  totalAmount: unknown;
  status: CasualSwimBillStatus;
  createdAt: Date;
  createdById: string;
  createdBy: { name: string; username: string };
}): CasualSwimBillDto {
  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    hours: row.hours,
    adultCount: row.adultCount,
    childCount: row.childCount,
    capQty: row.capQty,
    shortsQty: row.shortsQty,
    gogglesQty: row.gogglesQty,
    adultRate: toJsonNumber(row.adultRate),
    childRate: toJsonNumber(row.childRate),
    capRate: toJsonNumber(row.capRate),
    shortsRate: toJsonNumber(row.shortsRate),
    gogglesRate: toJsonNumber(row.gogglesRate),
    swimmingAmount: toJsonNumber(row.swimmingAmount),
    rentalAmount: toJsonNumber(row.rentalAmount),
    totalAmount: toJsonNumber(row.totalAmount),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy.name || row.createdBy.username,
    createdByUsername: row.createdBy.username,
    createdById: row.createdById,
  };
}

export const CASUAL_SWIM_RECEIPT_LOGO = "/backgrounds/MR_logo.png";
