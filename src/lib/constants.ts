export const ITEM_TYPES = ["Coaching Package", "Accessories / Products"] as const;

export const COACHING_PACKAGE_TYPE = "Coaching Package" as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export const PAYMENT_STATUSES = ["FULLY_PAID", "PARTIALLY_PAID"] as const;

export type PaymentStatusType = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["UPI", "CASH", "CARD", "OTHER"] as const;

export type PaymentMethodType = (typeof PAYMENT_METHODS)[number];

export function paymentStatusLabel(status: PaymentStatusType | string) {
  if (status === "FULLY_PAID") return "Fully Paid";
  if (status === "PARTIALLY_PAID") return "Partially Paid";
  return status;
}

export function paymentStatusPdfLabel(status: PaymentStatusType | string) {
  if (status === "FULLY_PAID") return "PAID";
  if (status === "PARTIALLY_PAID") return "PARTIALLY PAID";
  return status;
}

export function paymentMethodLabel(method: PaymentMethodType | string) {
  switch (method) {
    case "CASH":
      return "Cash";
    case "CARD":
      return "Card";
    case "UPI":
      return "UPI";
    case "OTHER":
      return "Others";
    default:
      return method;
  }
}

export function isCoachingPackage(itemType: string) {
  return itemType === COACHING_PACKAGE_TYPE;
}
