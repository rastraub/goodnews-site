import type { NextConfig } from "next";
import { STATES } from "./lib/states";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Story photos are already sized WebP files in /public. Serving them
    // directly keeps the first request fast on Vercel and in Lighthouse.
    unoptimized: true,
  },
  async redirects() {
    return STATES.map((state) => ({
      source: `/state/${state.code.toLowerCase()}`,
      destination: `/state/${state.slug}`,
      permanent: false,
    }));
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
