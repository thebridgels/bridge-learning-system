import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 15 MB upload limit (see src/lib/uploads.ts) plus multipart overhead.
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
