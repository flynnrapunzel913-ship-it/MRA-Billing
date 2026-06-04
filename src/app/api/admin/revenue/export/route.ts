import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-api";
import { apiErrorResponse } from "@/lib/api-error";
import { getExportRows, rowsToCsv } from "@/lib/revenue-analytics";
import { paymentStatusLabel, paymentMethodLabel } from "@/lib/constants";
import { rateLimitRevenueExport } from "@/lib/security/request-rate-limit";

export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireAdmin();
    if (error) return error;

    // Belt-and-suspenders with middleware rate limit (admin export abuse protection).
    const limited = rateLimitRevenueExport(request, user!.id);
    if (limited) return limited;

    const params = request.nextUrl.searchParams;
    const from = params.get("from");
    const to = params.get("to");

    if (!from || !to) {
      return NextResponse.json({ error: "from and to dates are required" }, { status: 400 });
    }

    const rows = await getExportRows(from, to);
    const csvRows = rows.map((r) => ({
      "Invoice Number": r.invoiceNumber,
      Date: r.date,
      "Customer Name": r.customerName,
      Amount: r.amount.toFixed(2),
      "Payment Status": paymentStatusLabel(r.paymentStatus),
      "Created By": r.createdBy,
      "Payment Method": paymentMethodLabel(r.paymentMethod),
    }));

    const csv = rowsToCsv(csvRows, [
      "Invoice Number",
      "Date",
      "Customer Name",
      "Amount",
      "Payment Status",
      "Created By",
      "Payment Method",
    ]);

    const filename = `mra-revenue-${from}-to-${to}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to export revenue");
  }
}
