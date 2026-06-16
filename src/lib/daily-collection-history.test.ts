import { describe, expect, it } from "vitest";
import { buildVersionHistoryResponse } from "@/lib/daily-collection-history";

describe("buildVersionHistoryResponse", () => {
  it("builds version 0 plus chronological edit versions", () => {
    const collectedAt = new Date("2026-06-23T12:45:00.000Z");
    const edit1At = new Date("2026-06-23T14:12:00.000Z");
    const edit2At = new Date("2026-06-23T15:40:00.000Z");

    const response = buildVersionHistoryResponse({
      dailyCollectionId: "dc-1",
      collectedAt,
      collectedBy: { id: "u1", name: "Owner", username: "owner" },
      originalSnapshotJson: {
        totalRevenue: 3000,
        totalExpenses: 200,
        cashCollected: 1800,
        upiCollected: 1200,
        netCollection: 2800,
      },
      fallbackSnapshot: {
        notes: null,
        collectedByName: "Owner",
        totalRevenue: 3000,
        subscriptionRevenue: 2500,
        productRevenue: 500,
        totalExpenses: 350,
        cashCollected: 1800,
        upiCollected: 1200,
        netCollection: 2650,
        cashCountedPhysical: 1800,
        cashDifference: 0,
        cashDifferenceNotes: null,
      },
      historyRows: [
        {
          id: "h1",
          createdAt: edit1At,
          changesJson: {
            totalExpenses: { old: 200, new: 350 },
            netCollection: { old: 2800, new: 2650 },
          },
          editedBy: { id: "u2", name: "Staff", username: "staff" },
        },
        {
          id: "h2",
          createdAt: edit2At,
          changesJson: {
            cashCollected: { old: 1800, new: 1700 },
            upiCollected: { old: 1200, new: 1300 },
          },
          editedBy: { id: "u2", name: "Staff", username: "staff" },
        },
      ],
    });

    expect(response.versions).toHaveLength(3);
    expect(response.versions[0]).toMatchObject({
      version: 0,
      type: "original",
      snapshot: { totalRevenue: 3000, totalExpenses: 200 },
    });
    expect(response.versions[1]).toMatchObject({
      version: 1,
      type: "edit",
      changes: { totalExpenses: { old: 200, new: 350 } },
    });
    expect(response.versions[2]).toMatchObject({
      version: 2,
      type: "edit",
      changes: { cashCollected: { old: 1800, new: 1700 } },
    });
    expect(response.lastEditedAt).toBe(edit2At.toISOString());
  });
});
