import path from "node:path";

const ALLOWED_BRANDING_DIR = "branding";

/** Only paths under /branding/ — blocks traversal and arbitrary public file reads. */
export function isAllowedBrandingAssetPath(urlPath: string): boolean {
  if (!urlPath?.trim()) return false;
  const trimmed = urlPath.trim();
  if (trimmed.includes("\0") || trimmed.includes("..")) return false;
  if (trimmed.startsWith("data:")) {
    return /^data:image\/(png|jpe?g|gif|webp);/i.test(trimmed);
  }

  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length < 2) return false;
  if (segments[0] !== ALLOWED_BRANDING_DIR) return false;
  return segments.every((seg) => seg !== ".." && seg !== "." && seg.length > 0);
}

/** Block SSRF to private networks, localhost, and cloud metadata endpoints. */
export function isBlockedFetchHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "metadata.google.internal") return true;

  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) {
    return true;
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const octets = ipv4.slice(1, 5).map(Number);
    if (octets.some((n) => n > 255)) return true;
    const [a, b] = octets;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }

  return false;
}

export function resolveSafeBrandingRelativePath(urlPath: string): string | null {
  if (!isAllowedBrandingAssetPath(urlPath)) return null;
  const normalized = urlPath.trim().startsWith("/") ? urlPath.trim() : `/${urlPath.trim()}`;
  return normalized.replace(/^\/+/, "");
}

export function assertPublicBrandingFileWithinRoot(root: string, absolutePath: string): boolean {
  const rootResolved = path.resolve(root);
  const fileResolved = path.resolve(absolutePath);
  return fileResolved === rootResolved || fileResolved.startsWith(`${rootResolved}${path.sep}`);
}
