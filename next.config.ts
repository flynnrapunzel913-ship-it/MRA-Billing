import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["192.168.56.1"],
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
  outputFileTracingIncludes: {
    "/api/invoices/[id]/pdf": ["./public/branding/**"],
  },
};

export default nextConfig;
