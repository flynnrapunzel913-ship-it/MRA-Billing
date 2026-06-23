import fs from "node:fs";
import path from "node:path";
import {
  ACADEMY_FOOTER_PATH,
  ACADEMY_LOGO_FALLBACKS,
} from "@/lib/branding-assets";
import {
  assertPublicBrandingFileWithinRoot,
  isAllowedBrandingAssetPath,
  isBlockedFetchHostname,
  resolveSafeBrandingRelativePath,
} from "@/lib/pdf-image-security";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

export type PdfImageSource =
  | string
  | { data: Buffer; format: "png" | "jpg" | "jpeg" };

let cachedLogoSrc: PdfImageSource | undefined;

function toDataUri(buffer: Buffer, ext: string): string {
  const mime = MIME[ext] ?? "application/octet-stream";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function findPublicRoots(): string[] {
  const cwd = process.cwd();
  const roots = [path.join(cwd, "public"), path.join(cwd, "MRA-Billing", "public")];
  return [...new Set(roots.filter((root) => fs.existsSync(root)))];
}

function publicFileCandidates(relativePath: string): string[] {
  const safeRelative = resolveSafeBrandingRelativePath(`/${relativePath.replace(/^\/+/, "")}`);
  if (!safeRelative) return [];
  return findPublicRoots().map((root) => path.join(root, safeRelative));
}

function findExistingFile(relativePaths: readonly string[]): string | null {
  for (const relativePath of relativePaths) {
    for (const filePath of publicFileCandidates(relativePath)) {
      if (fs.existsSync(filePath)) return filePath;
    }
  }
  return null;
}

function readPublicAsset(relativePath: string): string | null {
  if (!isAllowedBrandingAssetPath(relativePath)) return null;
  const filePath = findExistingFile([relativePath.startsWith("/") ? relativePath : `/${relativePath}`]);
  if (!filePath) return null;

  const allowed = findPublicRoots().some((root) =>
    assertPublicBrandingFileWithinRoot(root, filePath)
  );
  if (!allowed) return null;

  try {
    const buf = fs.readFileSync(filePath);
    if (buf.length === 0) return null;
    const ext = path.extname(filePath).slice(1).toLowerCase();
    return toDataUri(buf, ext);
  } catch {
    return null;
  }
}

function bufferSourceFromFile(filePath: string): PdfImageSource | null {
  try {
    const buf = fs.readFileSync(filePath);
    if (buf.length === 0) return null;
    const ext = path.extname(filePath).slice(1).toLowerCase();

    // Sniff magic bytes because some assets are mislabeled (e.g. .png containing JPEG data).
    const isJpeg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isPng =
      buf.length > 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a;

    if (isJpeg || ext === "jpg" || ext === "jpeg") {
      return { data: buf, format: "jpg" };
    }
    if (isPng || ext === "png") {
      return { data: buf, format: "png" };
    }

    return toDataUri(buf, ext || "png");
  } catch {
    return null;
  }
}

/** Logo source for react-pdf — Buffer format renders PNG reliably in pdfkit. */
export function getAcademyLogoForPdf(): PdfImageSource {
  if (cachedLogoSrc !== undefined) return cachedLogoSrc;

  const filePath = findExistingFile([
    "/branding/logo.jpg",
    ...ACADEMY_LOGO_FALLBACKS,
  ]);

  if (filePath) {
    const source = bufferSourceFromFile(filePath);
    if (source) {
      cachedLogoSrc = source;
      return source;
    }
  }

  cachedLogoSrc = "";
  return "";
}

/** @deprecated Use getAcademyLogoForPdf */
export function getAcademyLogoDataUriSync(): string {
  const src = getAcademyLogoForPdf();
  return typeof src === "string" ? src : "";
}

export function normalizeBrandingPath(url: string | null | undefined): string {
  if (!url?.trim()) return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("/")) return isAllowedBrandingAssetPath(trimmed) ? trimmed : "";
  try {
    const pathname = new URL(trimmed).pathname;
    return isAllowedBrandingAssetPath(pathname) ? pathname : "";
  } catch {
    return "";
  }
}

export async function resolvePdfImageSrc(
  url: string | null | undefined,
  requestOrigin?: string
): Promise<string | null> {
  if (!url?.trim()) return null;
  const trimmed = normalizeBrandingPath(url);
  if (!trimmed) return null;

  if (trimmed.startsWith("data:")) return trimmed;

  if (trimmed.startsWith("/")) {
    return readPublicAsset(trimmed);
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    if (isBlockedFetchHostname(parsed.hostname)) {
      return null;
    }

    if (requestOrigin) {
      try {
        const origin = new URL(requestOrigin);
        if (parsed.origin === origin.origin && parsed.pathname.startsWith("/")) {
          const local = readPublicAsset(parsed.pathname);
          if (local) return local;
        }
      } catch {
        /* ignore */
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(trimmed, { signal: controller.signal, redirect: "error" });
    clearTimeout(timer);
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!contentType.startsWith("image/")) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function resolveAcademyLogoDataUri(
  _settingsLogoUrl: string | null | undefined,
  _requestOrigin: string
): Promise<PdfImageSource> {
  return getAcademyLogoForPdf();
}

export async function resolveAcademyFooterDataUri(
  settingsFooterUrl: string | null | undefined,
  requestOrigin: string
): Promise<string> {
  const candidates = [
    normalizeBrandingPath(settingsFooterUrl),
    ACADEMY_FOOTER_PATH,
  ].filter((value, index, list): value is string => {
    if (!value) return false;
    return list.indexOf(value) === index;
  });

  for (const candidate of candidates) {
    const resolved = await resolvePdfImageSrc(candidate, requestOrigin);
    if (resolved) return resolved;
  }

  return "";
}

export async function resolvePdfBrandingSettings<
  T extends {
    logoUrl: string;
    footerImageUrl: string;
    signatureUrl: string | null;
  },
>(settings: T, requestOrigin: string): Promise<T & { logoUrl: PdfImageSource }> {
  const logoUrl = getAcademyLogoForPdf();
  const [footerImageUrl, signatureUrl] = await Promise.all([
    resolveAcademyFooterDataUri(settings.footerImageUrl, requestOrigin),
    settings.signatureUrl
      ? resolvePdfImageSrc(settings.signatureUrl, requestOrigin)
      : Promise.resolve(null),
  ]);

  return {
    ...settings,
    logoUrl,
    footerImageUrl,
    signatureUrl,
  };
}
