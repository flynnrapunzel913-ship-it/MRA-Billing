import {
  DANGEROUS_EXTENSIONS,
  PDF_ALLOWED_EXTENSION,
  PDF_ALLOWED_MIME_TYPES,
  PDF_UPLOAD_MAX_BYTES,
} from "@/lib/uploads/constants";

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

function hasPdfMagicHeader(buffer: Buffer): boolean {
  // PDF files begin with "%PDF-" (bytes 25 50 44 46 2D)
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

/**
 * Defense-in-depth PDF validation: size, extension, MIME, and magic bytes.
 */
export function validatePdfUpload(file: File, buffer: Buffer): void {
  if (!file || !(file instanceof File)) {
    throw new UploadValidationError("PDF file is required");
  }

  if (file.size <= 0) {
    throw new UploadValidationError("Empty files are not allowed");
  }

  if (file.size > PDF_UPLOAD_MAX_BYTES) {
    throw new UploadValidationError("PDF must be 10 MB or smaller");
  }

  if (buffer.length > PDF_UPLOAD_MAX_BYTES) {
    throw new UploadValidationError("PDF must be 10 MB or smaller");
  }

  const lowerName = file.name.toLowerCase().trim();
  if (!lowerName || lowerName.includes("..") || lowerName.includes("/") || lowerName.includes("\\")) {
    throw new UploadValidationError("Invalid file name");
  }

  for (const dangerous of DANGEROUS_EXTENSIONS) {
    if (dangerous !== PDF_ALLOWED_EXTENSION && lowerName.includes(dangerous)) {
      throw new UploadValidationError("File type is not allowed");
    }
  }

  if (!lowerName.endsWith(PDF_ALLOWED_EXTENSION)) {
    throw new UploadValidationError("Only PDF files are allowed");
  }

  const ext = lowerName.slice(lowerName.lastIndexOf("."));
  if (ext !== PDF_ALLOWED_EXTENSION) {
    throw new UploadValidationError("Only PDF files are allowed");
  }

  const baseName = lowerName.slice(0, -PDF_ALLOWED_EXTENSION.length);
  if (!baseName || baseName.includes(".")) {
    throw new UploadValidationError("Only a single .pdf extension is allowed");
  }

  const mime = (file.type || "").toLowerCase().trim();
  if (mime && !PDF_ALLOWED_MIME_TYPES.has(mime)) {
    throw new UploadValidationError("Invalid file type — PDF required");
  }

  if (!hasPdfMagicHeader(buffer)) {
    throw new UploadValidationError("File content is not a valid PDF");
  }
}
