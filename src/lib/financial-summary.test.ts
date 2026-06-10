import { describe, expect, it } from "vitest";
import { getFinancialSummaryDateRange } from "@/lib/financial-summary";
import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from "date-fns";

describe("getFinancialSummaryDateRange", () => {
  it("returns today boundaries", () => {
    const now = new Date();
    const { start, end } = getFinancialSummaryDateRange("today");
    expect(start.getTime()).toBe(startOfDay(now).getTime());
    expect(end.getTime()).toBe(endOfDay(now).getTime());
  });

  it("returns week boundaries (Monday start)", () => {
    const now = new Date();
    const { start, end } = getFinancialSummaryDateRange("week");
    expect(start.getTime()).toBe(startOfWeek(now, { weekStartsOn: 1 }).getTime());
    expect(end.getTime()).toBe(endOfWeek(now, { weekStartsOn: 1 }).getTime());
  });

  it("returns month boundaries", () => {
    const now = new Date();
    const { start, end } = getFinancialSummaryDateRange("month");
    expect(start.getTime()).toBe(startOfMonth(now).getTime());
    expect(end.getTime()).toBe(endOfMonth(now).getTime());
  });
});
