import { describe, expect, it } from "vitest";
import {
  calculatePackageEndDate,
  formatDurationLabel,
  packageEndDateForLineItem,
  parseDurationLabel,
} from "@/lib/subscription-duration";

describe("subscription duration", () => {
  it("formats duration labels", () => {
    expect(formatDurationLabel(1, "MONTHS")).toBe("1 Month");
    expect(formatDurationLabel(3, "MONTHS")).toBe("3 Months");
    expect(formatDurationLabel(30, "DAYS")).toBe("30 Days");
  });

  it("calculates inclusive end dates", () => {
    expect(calculatePackageEndDate("2026-06-01", 1, "MONTHS")).toBe("2026-06-30");
    expect(calculatePackageEndDate("2026-06-01", 30, "DAYS")).toBe("2026-06-30");
    expect(calculatePackageEndDate("2026-06-01", 1, "YEARS")).toBe("2027-05-31");
  });

  it("parses legacy duration strings", () => {
    expect(parseDurationLabel("2 Months")).toEqual({ durationValue: 2, durationUnit: "MONTHS" });
    expect(parseDurationLabel("1 Year")).toEqual({ durationValue: 1, durationUnit: "YEARS" });
    expect(parseDurationLabel("1 Hour")).toEqual({ durationValue: 1, durationUnit: "DAYS" });
  });

  it("derives end date from line item snapshots", () => {
    expect(
      packageEndDateForLineItem({
        packageStartDate: "2026-06-01",
        durationValueSnapshot: 1,
        durationUnitSnapshot: "MONTHS",
      })
    ).toBe("2026-06-30");
  });
});
