import { describe, expect, it } from "vitest";
import {
  isAllowedBrandingAssetPath,
  isBlockedFetchHostname,
} from "@/lib/pdf-image-security";

describe("isAllowedBrandingAssetPath", () => {
  it("allows branding paths", () => {
    expect(isAllowedBrandingAssetPath("/branding/logo.png")).toBe(true);
    expect(isAllowedBrandingAssetPath("/branding/footer-curves.jpeg")).toBe(true);
  });

  it("blocks traversal and arbitrary paths", () => {
    expect(isAllowedBrandingAssetPath("/etc/passwd")).toBe(false);
    expect(isAllowedBrandingAssetPath("/branding/../.env")).toBe(false);
    expect(isAllowedBrandingAssetPath("/uploads/stock-bills/x.pdf")).toBe(false);
  });
});

describe("isBlockedFetchHostname", () => {
  it("blocks localhost and private networks", () => {
    expect(isBlockedFetchHostname("localhost")).toBe(true);
    expect(isBlockedFetchHostname("127.0.0.1")).toBe(true);
    expect(isBlockedFetchHostname("10.0.0.1")).toBe(true);
    expect(isBlockedFetchHostname("169.254.169.254")).toBe(true);
    expect(isBlockedFetchHostname("192.168.1.1")).toBe(true);
  });

  it("allows public hosts", () => {
    expect(isBlockedFetchHostname("cdn.example.com")).toBe(false);
  });
});
