import { describe, expect, it } from "vitest";
import {
  buildCollectionChangesJson,
  extractCollectionDiffValues,
  hasCollectionChanges,
} from "@/lib/daily-collection-diff";

const baseRecord = {
  notes: null,
  collectedByName: "Admin",
  totalRevenue: 3000,
  subscriptionRevenue: 2500,
  productRevenue: 500,
  totalExpenses: 200,
  cashCollectedSystem: 1800,
  upiCollected: 1200,
  netCollection: 2800,
  cashCountedPhysical: 1800,
  cashDifference: 0,
  cashDifferenceNotes: null,
};

describe("daily-collection-diff", () => {
  it("extracts comparable diff values from a collection record", () => {
    const values = extractCollectionDiffValues(baseRecord);
    expect(values.cashCollected).toBe(1800);
    expect(values.totalExpenses).toBe(200);
  });

  it("builds a diff with only changed fields", () => {
    const before = extractCollectionDiffValues(baseRecord);
    const after = extractCollectionDiffValues({
      ...baseRecord,
      totalExpenses: 350,
      netCollection: 2650,
    });

    const changes = buildCollectionChangesJson(before, after);

    expect(hasCollectionChanges(changes)).toBe(true);
    expect(changes.totalExpenses).toEqual({ old: 200, new: 350 });
    expect(changes.netCollection).toEqual({ old: 2800, new: 2650 });
    expect(changes.cashCollected).toBeUndefined();
  });

  it("returns empty diff when values are unchanged", () => {
    const values = extractCollectionDiffValues(baseRecord);
    const changes = buildCollectionChangesJson(values, values);
    expect(hasCollectionChanges(changes)).toBe(false);
  });
});
