import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOperationalAccess } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { readStockBill } from "@/lib/stock-storage";
import { getRequestMeta, recordStockActivity } from "@/lib/stock-activity";
import { getActiveStockWhere } from "@/lib/stock-filters";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { error, user } = await requireOperationalAccess();
    if (error) return error;

    const { id } = await context.params;
    const stockWhere = await getActiveStockWhere();
    const entry = await prisma.stockEntry.findFirst({
      where: { id, ...stockWhere },
      select: { id: true, stockNumber: true, billPdfUrl: true, billFileName: true },
    });

    if (!entry) {
      return NextResponse.json({ error: "Stock entry not found" }, { status: 404 });
    }

    if (!entry.billPdfUrl) {
      return NextResponse.json({ error: "No bill PDF uploaded for this entry" }, { status: 404 });
    }

    const buffer = await readStockBill(entry.billPdfUrl);
    const disposition = request.nextUrl.searchParams.get("disposition") === "attachment"
      ? "attachment"
      : "inline";

    const meta = getRequestMeta(request);
    void recordStockActivity(prisma, {
      stockEntryId: entry.id,
      userId: user!.id!,
      type: disposition === "attachment" ? "BILL_DOWNLOADED" : "BILL_VIEWED",
      description: `${disposition === "attachment" ? "Downloaded" : "Viewed"} bill for ${entry.stockNumber}`,
      ...meta,
    });

    const fileName = entry.billFileName || `${entry.stockNumber}-bill.pdf`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load bill PDF");
  }
}
