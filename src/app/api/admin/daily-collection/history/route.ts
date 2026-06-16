import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { parseCollectionDateInput } from "@/lib/daily-collection";
import { extractCollectionDiffValues } from "@/lib/daily-collection-diff";
import { buildVersionHistoryResponse } from "@/lib/daily-collection-history";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const dateStr = request.nextUrl.searchParams.get("date") || format(new Date(), "yyyy-MM-dd");
    const collectionDate = parseCollectionDateInput(dateStr);
    if (!collectionDate) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const collection = await prisma.dailyCollection.findUnique({
      where: { collectionDate },
      include: {
        collectedBy: { select: { id: true, name: true, username: true } },
        editHistory: {
          orderBy: { createdAt: "asc" },
          include: {
            editedBy: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "No collection for this date" }, { status: 404 });
    }

    if (collection.editHistory.length === 0) {
      return NextResponse.json({
        dailyCollectionId: collection.id,
        lastEditedAt: null,
        versions: [],
      });
    }

    const fallbackSnapshot = extractCollectionDiffValues(collection);

    const response = buildVersionHistoryResponse({
      dailyCollectionId: collection.id,
      collectedAt: collection.collectedAt,
      collectedBy: collection.collectedBy,
      originalSnapshotJson: collection.originalSnapshotJson,
      fallbackSnapshot,
      historyRows: collection.editHistory,
    });

    return NextResponse.json(response);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load collection version history");
  }
}
