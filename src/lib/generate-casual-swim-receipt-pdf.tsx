import { renderToBuffer } from "@react-pdf/renderer";
import { CasualSwimReceiptPDF } from "@/components/pdf/casual-swim-receipt-pdf";
import type { CasualSwimBillDto } from "@/lib/casual-swim-bill";
import { CASUAL_SWIM_RECEIPT_LOGO } from "@/lib/casual-swim-bill";
import { getAcademyLogoForPdf, type PdfImageSource } from "@/lib/pdf-image";

function pdfImageSrcToString(src: PdfImageSource): string {
  if (typeof src === "string") return src;
  const format = src.format === "jpg" ? "jpeg" : src.format;
  return `data:image/${format};base64,${src.data.toString("base64")}`;
}

export async function generateCasualSwimReceiptPdfBuffer(
  bill: CasualSwimBillDto
): Promise<Buffer> {
  const logoFromReceipt = await resolveReceiptLogo();
  const fallback = getAcademyLogoForPdf();
  const logoSrc =
    logoFromReceipt ??
    (typeof fallback === "string" ? fallback : pdfImageSrcToString(fallback));

  return renderToBuffer(<CasualSwimReceiptPDF bill={bill} logoSrc={logoSrc} />);
}

async function resolveReceiptLogo(): Promise<string | null> {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const relative = CASUAL_SWIM_RECEIPT_LOGO.replace(/^\//, "");
  const filePath = path.join(process.cwd(), "public", relative);
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase() || "png";
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}
