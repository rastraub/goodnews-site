import type { NextConfig } from "next";
import { COUNTRIES } from "./lib/countries";
import { STATES } from "./lib/states";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Story photos are already sized WebP files in /public (about 840px, plus a 360px card file).
    // Cards use srcSet, and listing pages are paginated, so a large archive does not request every image.
    unoptimized: true,
  },
  async redirects() {
    return [
      ...STATES.map((state) => ({
        source: `/state/${state.code.toLowerCase()}`,
        destination: `/state/${state.slug}`,
        permanent: false,
      })),
      ...COUNTRIES.map((country) => ({
        source: `/country/${country.code.toLowerCase()}`,
        destination: `/country/${country.slug}`,
        permanent: false,
      })),
    ];
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
