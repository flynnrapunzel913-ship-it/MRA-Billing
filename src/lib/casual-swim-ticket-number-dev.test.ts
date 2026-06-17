import { describe, expect, it } from "vitest";
import { nextDevTicketNumber } from "@/lib/casual-swim-ticket-number-dev";

describe("nextDevTicketNumber", () => {
  it("returns 1 when no tickets exist", () => {
    expect(nextDevTicketNumber([])).toBe(1);
  });

  it("reuses #1 after it is deleted", () => {
    expect(nextDevTicketNumber([])).toBe(1);
  });

  it("returns 1 after #1 and #2 are both deleted", () => {
    expect(nextDevTicketNumber([])).toBe(1);
  });

  it("fills the lowest gap when a ticket number is freed", () => {
    expect(nextDevTicketNumber([2, 3])).toBe(1);
    expect(nextDevTicketNumber([1, 3])).toBe(2);
    expect(nextDevTicketNumber([1, 2])).toBe(3);
  });

  it("returns next sequential when no gaps exist", () => {
    expect(nextDevTicketNumber([1])).toBe(2);
    expect(nextDevTicketNumber([1, 2])).toBe(3);
  });
});
