import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { getActiveInvoiceWhere } from "@/lib/invoice-filters";
import { generateInvoicePdfBuffer } from "@/lib/generate-invoice-pdf";
import {
  ACADEMY_FOOTER_PATH,
  ACADEMY_LOGO_PATH,
} from "@/lib/branding-assets";
import { resolvePdfBrandingSettings } from "@/lib/pdf-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PDF_SETTINGS = {
  academyName: "MR Academy",
  phonePrimary: "",
  phoneSecondary: null as string | null,
  email: "",
  website: null as string | null,
  gstNumber: "",
  gstEnabled: true,
  logoUrl: ACADEMY_LOGO_PATH,
  footerImageUrl: ACADEMY_FOOTER_PATH,
  signatureUrl: null as string | null,
  brandColor: "#0070C0",
  termsAndConditions: "",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const invoiceWhere = await getActiveInvoiceWhere();

    const [invoice, settingsRow] = await Promise.all([
      prisma.invoice.findFirst({
        where: { id, ...invoiceWhere },
        include: { items: { orderBy: { slNo: "asc" } } },
      }),
      prisma.settings.findUnique({ where: { id: "default" } }),
    ]);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const settings = settingsRow ?? DEFAULT_PDF_SETTINGS;
    const origin = request.nextUrl.origin;

    const pdfSettings = await resolvePdfBrandingSettings(
      {
        academyName: settings.academyName,
        phonePrimary: settings.phonePrimary,
        phoneSecondary: settings.phoneSecondary,
        email: settings.email,
        website: settings.website,
        gstNumber: settings.gstNumber,
        gstEnabled: settings.gstEnabled,
        logoUrl: settings.logoUrl,
        footerImageUrl: settings.footerImageUrl,
        signatureUrl: settings.signatureUrl,
        brandColor: settings.brandColor,
        termsAndConditions: settings.termsAndConditions,
      },
      origin
    );

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
      paymentMethod: invoice.paymentMethod ?? "CASH",
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
