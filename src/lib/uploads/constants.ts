/** Stock bill PDF uploads — security limits */
export const PDF_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const PDF_ALLOWED_EXTENSION = ".pdf";

export const PDF_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/x-pdf",
  "application/acrobat",
  "application/vnd.pdf",
]);

/** Reject uploads whose names contain dangerous secondary extensions. */
export const DANGEROUS_EXTENSIONS = [
  ".exe",
  ".sh",
  ".bat",
  ".cmd",
  ".com",
  ".php",
  ".jsp",
  ".asp",
  ".aspx",
  ".html",
  ".htm",
  ".js",
  ".mjs",
  ".msi",
  ".dll",
  ".svg",
  ".zip",
  ".rar",
  ".7z",
  ".docm",
  ".xlsm",
];
