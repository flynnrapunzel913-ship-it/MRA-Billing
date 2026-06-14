import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  format,
  isValid,
  parseISO,
  subDays,
} from "date-fns";

export const SUBSCRIPTION_DURATION_UNITS = ["DAYS", "WEEKS", "MONTHS", "YEARS"] as const;

export type SubscriptionDurationUnit = (typeof SUBSCRIPTION_DURATION_UNITS)[number];

export const SUBSCRIPTION_DURATION_UNIT_LABELS: Record<SubscriptionDurationUnit, string> = {
  DAYS: "Days",
  WEEKS: "Weeks",
  MONTHS: "Months",
  YEARS: "Years",
};

export function formatDurationLabel(
  value: number,
  unit: SubscriptionDurationUnit
): string {
  const n = Math.max(1, Math.floor(value));
  const singular = unit === "DAYS" ? "Day" : unit === "WEEKS" ? "Week" : unit === "MONTHS" ? "Month" : "Year";
  const plural = SUBSCRIPTION_DURATION_UNIT_LABELS[unit];
  return n === 1 ? `1 ${singular}` : `${n} ${plural}`;
}

/** Inclusive membership end date: start + duration, last valid day. */
export function calculatePackageEndDate(
  startDateStr: string,
  value: number,
  unit: SubscriptionDurationUnit
): string {
  if (!startDateStr || !Number.isFinite(value) || value <= 0) return "";

  const start = parseISO(startDateStr);
  if (!isValid(start)) return "";

  let periodEndExclusive: Date;
  switch (unit) {
    case "DAYS":
      periodEndExclusive = addDays(start, value);
      break;
    case "WEEKS":
      periodEndExclusive = addWeeks(start, value);
      break;
    case "MONTHS":
      periodEndExclusive = addMonths(start, value);
      break;
    case "YEARS":
      periodEndExclusive = addYears(start, value);
      break;
    default:
      return "";
  }

  return format(subDays(periodEndExclusive, 1), "yyyy-MM-dd");
}

/** Best-effort parse for legacy duration text (e.g. "3 Months", "1 Year"). */
export function parseDurationLabel(duration: string): {
  durationValue: number;
  durationUnit: SubscriptionDurationUnit;
} {
  const trimmed = duration.trim();
  const match = trimmed.match(/^(\d+)\s*(day|days|week|weeks|month|months|year|years|hour|hours)/i);
  if (!match) {
    return { durationValue: 1, durationUnit: "MONTHS" };
  }

  const value = Math.max(1, Number(match[1]));
  const unitWord = match[2].toLowerCase();

  if (unitWord.startsWith("day") || unitWord.startsWith("hour")) {
    return { durationValue: value, durationUnit: "DAYS" };
  }
  if (unitWord.startsWith("week")) {
    return { durationValue: value, durationUnit: "WEEKS" };
  }
  if (unitWord.startsWith("year")) {
    return { durationValue: value, durationUnit: "YEARS" };
  }
  return { durationValue: value, durationUnit: "MONTHS" };
}

export function resolveLineItemDuration(item: {
  durationValueSnapshot?: number;
  durationUnitSnapshot?: SubscriptionDurationUnit | string | null;
  durationSnapshot?: string;
}): { durationValue: number; durationUnit: SubscriptionDurationUnit } | null {
  if (
    item.durationValueSnapshot != null &&
    item.durationValueSnapshot > 0 &&
    item.durationUnitSnapshot &&
    SUBSCRIPTION_DURATION_UNITS.includes(item.durationUnitSnapshot as SubscriptionDurationUnit)
  ) {
    return {
      durationValue: item.durationValueSnapshot,
      durationUnit: item.durationUnitSnapshot as SubscriptionDurationUnit,
    };
  }

  if (item.durationSnapshot?.trim()) {
    return parseDurationLabel(item.durationSnapshot);
  }

  return null;
}

export function packageEndDateForLineItem(item: {
  packageStartDate?: string;
  packageEndDate?: string;
  durationValueSnapshot?: number;
  durationUnitSnapshot?: SubscriptionDurationUnit | string | null;
  durationSnapshot?: string;
}): string {
  if (!item.packageStartDate) return item.packageEndDate ?? "";

  const duration = resolveLineItemDuration(item);
  if (!duration) return item.packageEndDate ?? "";

  return (
    calculatePackageEndDate(
      item.packageStartDate,
      duration.durationValue,
      duration.durationUnit
    ) || item.packageEndDate || ""
  );
}
