import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePDFDocument } from "@/components/pdf/invoice-pdf";
import { getAcademyLogoForPdf, type PdfImageSource } from "@/lib/pdf-image";

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date | string;
  dueDate: Date | string;
  customerName: string;
  customerMobile: string | null;
  customerAddress: string | null;
  customerGst: string | null;
  subtotal: number;
  gstEnabled: boolean;
  cgstRate: number;
  sgstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  totalGst: number;
  grandTotal: number;
  amountInWords: string;
  paymentStatus: string;
  paymentMethod: string;
  amountPaid: number;
  amountRemaining: number;
  items: Array<{
    slNo: number;
    itemType: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    packageStartDate?: Date | string | null;
    packageEndDate?: Date | string | null;
  }>;
}

interface SettingsData {
  academyName: string;
  phonePrimary: string;
  phoneSecondary: string | null;
  email: string;
  website: string | null;
  gstNumber: string;
  gstEnabled: boolean;
  logoUrl: PdfImageSource;
  footerImageUrl: string;
  signatureUrl: string | null;
  brandColor: string;
  termsAndConditions: string;
}

export async function generateInvoicePdfBuffer(
  invoice: InvoiceData,
  settings: SettingsData
) {
  const logoUrl = getAcademyLogoForPdf();

  return renderToBuffer(
    <InvoicePDFDocument invoice={invoice} settings={{ ...settings, logoUrl }} />
  );
}
