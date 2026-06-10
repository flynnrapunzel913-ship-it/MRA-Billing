import { describe, expect, it } from "vitest";
import {
  calculateCashDifference,
  calculatePhysicalCash,
  formatCashDifference,
  normalizeDenominations,
} from "@/lib/cash-denominations";

describe("cash denominations", () => {
  it("calculates physical cash from quantities", () => {
    const total = calculatePhysicalCash(
      normalizeDenominations({ "500": 10, "200": 5, "100": 3 })
    );
    expect(total).toBe(6300);
  });

  it("calculates difference as physical minus system", () => {
    expect(calculateCashDifference(6300, 6500)).toBe(-200);
    expect(calculateCashDifference(6800, 6500)).toBe(300);
    expect(calculateCashDifference(6500, 6500)).toBe(0);
  });

  it("formats difference labels", () => {
    expect(formatCashDifference(0).reconciled).toBe(true);
    expect(formatCashDifference(-200).label).toContain("Short");
    expect(formatCashDifference(300).label).toContain("Excess");
  });
});
