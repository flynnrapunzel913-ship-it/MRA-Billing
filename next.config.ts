import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["192.168.56.1"],
  outputFileTracingIncludes: {
    "/api/invoices/[id]/pdf": ["./public/branding/**"],
  },
};

export default nextConfig;
