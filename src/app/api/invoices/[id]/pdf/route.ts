import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { getActiveInvoiceWhere } from "@/lib/invoice-filters";
import { generateInvoicePdfBuffer } from "@/lib/generate-invoice-pdf";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const invoiceWhere = await getActiveInvoiceWhere();

    const [invoice, settings] = await Promise.all([
      prisma.invoice.findFirst({
        where: { id, ...invoiceWhere },
        include: { items: { orderBy: { slNo: "asc" } } },
      }),
      prisma.settings.findUnique({ where: { id: "default" } }),
    ]);

    if (!invoice || !settings) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resolveUrl = (url: string) => (url.startsWith("http") ? url : `${origin}${url}`);

    const pdfSettings = {
      academyName: settings.academyName,
      phonePrimary: settings.phonePrimary,
      phoneSecondary: settings.phoneSecondary,
      email: settings.email,
      website: settings.website,
      gstNumber: settings.gstNumber,
      gstEnabled: settings.gstEnabled,
      logoUrl: resolveUrl(settings.logoUrl),
      footerImageUrl: resolveUrl(settings.footerImageUrl),
      signatureUrl: settings.signatureUrl ? resolveUrl(settings.signatureUrl) : null,
      brandColor: settings.brandColor,
      termsAndConditions: settings.termsAndConditions,
    };

    const pdfInvoice = {
      ...invoice,
      subtotal: Number(invoice.subtotal),
      gstEnabled: invoice.gstEnabled,
      cgstRate: Number(invoice.cgstRate),
      sgstRate: Number(invoice.sgstRate),
      cgstAmount: Number(invoice.cgstAmount),
      sgstAmount: Number(invoice.sgstAmount),
      totalGst: Number(invoice.totalGst),
      grandTotal: Number(invoice.grandTotal),
      amountPaid: Number(invoice.amountPaid),
      amountRemaining: Number(invoice.amountRemaining),
      paymentStatus: invoice.paymentStatus,
      paymentMethod: invoice.paymentMethod,
      items: invoice.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        amount: Number(item.amount),
        packageStartDate: item.packageStartDate,
        packageEndDate: item.packageEndDate,
      })),
    };

    const buffer = await generateInvoicePdfBuffer(pdfInvoice, pdfSettings);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to generate PDF");
  }
}
