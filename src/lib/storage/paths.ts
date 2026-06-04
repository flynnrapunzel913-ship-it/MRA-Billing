import path from "path";

/**
 * Resolve a relative storage key under an absolute root.
 * Blocks path traversal (.., absolute segments, null bytes).
 */
export function resolveStoragePath(rootDir: string, relativeKey: string): string {
  const normalized = relativeKey.replace(/\\/g, "/").replace(/\0/g, "").trim();
  if (!normalized || normalized.startsWith("/")) {
    throw new Error("Invalid file path");
  }
  if (normalized.includes("..") || normalized.split("/").some((seg) => seg === "..")) {
    throw new Error("Invalid file path");
  }

  const rootResolved = path.resolve(rootDir);
  const absolute = path.resolve(rootResolved, normalized);

  if (absolute !== rootResolved && !absolute.startsWith(`${rootResolved}${path.sep}`)) {
    throw new Error("Invalid file path");
  }

  return absolute;
}

export function sanitizeDisplayFileName(name: string, fallback: string) {
  const base = path.basename(name.replace(/\0/g, "").trim());
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return safe || fallback;
}

export function sanitizeStorageToken(input: string, maxLen = 32) {
  return input.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, maxLen);
}

/** Safe filename for Content-Disposition headers (prevents response header injection). */
export function safeContentDispositionFilename(name: string, fallback: string) {
  const safe = sanitizeDisplayFileName(name, fallback);
  return safe.replace(/["\r\n]/g, "_");
}
