import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalAccess } from "@/lib/api-auth";
import { apiErrorResponse } from "@/lib/api-error";
import { generateInvoicePdfBuffer } from "@/lib/generate-invoice-pdf";
import {
  ACADEMY_FOOTER_PATH,
  ACADEMY_LOGO_PATH,
} from "@/lib/branding-assets";
import { resolvePdfBrandingSettings } from "@/lib/pdf-image";
import {
  findAccessibleInvoice,
  invoiceForbiddenResponse,
  invoiceNotFoundResponse,
} from "@/lib/invoices/access";
import { safeContentDispositionFilename } from "@/lib/storage/paths";

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
    const { error, user } = await requireOperationalAccess();
    if (error) return error;

    const { id } = await params;

    type InvoiceWithItems = Prisma.InvoiceGetPayload<{
      include: { items: { orderBy: { slNo: "asc" } } };
    }>;

    const access = await findAccessibleInvoice<InvoiceWithItems>(id, {
      id: user!.id!,
      role: user!.role as Role,
    }, {
      include: { items: { orderBy: { slNo: "asc" } } },
    });

    if (!access.ok) {
      return access.status === 403 ? invoiceForbiddenResponse() : invoiceNotFoundResponse();
    }

    const invoice = access.invoice;

    const settingsRow = await prisma.settings.findUnique({ where: { id: "default" } });
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

    const safeFilename = safeContentDispositionFilename(
      `${invoice.invoiceNumber}.pdf`,
      "invoice.pdf"
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to generate PDF");
  }
}
