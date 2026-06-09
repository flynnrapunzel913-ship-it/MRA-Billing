import { describe, expect, it } from "vitest";
import {
  commitIntegerInput,
  effectiveIntegerValue,
  parsePositiveIntInput,
} from "./numeric-input";

describe("numeric quantity input helpers", () => {
  it("parses multi-digit quantities", () => {
    expect(parsePositiveIntInput("10")).toBe(10);
    expect(parsePositiveIntInput("100")).toBe(100);
  });

  it("keeps committed value for totals while draft is temporarily empty", () => {
    expect(parsePositiveIntInput("")).toBeNull();
    expect(effectiveIntegerValue(1, "")).toBe(1);
  });

  it("commits minimum on blur when empty", () => {
    expect(commitIntegerInput("", { min: 1, emptyFallback: 1 })).toBe(1);
  });

  it("commits typed values on blur", () => {
    expect(commitIntegerInput("2", { min: 1, emptyFallback: 1 })).toBe(2);
    expect(commitIntegerInput("25", { min: 1, emptyFallback: 1 })).toBe(25);
  });

  it("supports 1 → empty → 2 editing flow via effective value", () => {
    expect(effectiveIntegerValue(1, "2")).toBe(2);
    expect(commitIntegerInput("2", { min: 1, emptyFallback: 1 })).toBe(2);
  });
});
