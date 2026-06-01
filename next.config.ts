import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingIncludes: {
    "/api/invoices/[id]/pdf": ["./public/branding/**"],
  },
};

export default nextConfig;
