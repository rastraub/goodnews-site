import type { NextConfig } from "next";
import { COUNTRIES } from "./lib/countries";
import { FEED_CACHE_CONTROL, IMAGE_CACHE_CONTROL, NEWS_SITEMAP_CACHE_CONTROL } from "./lib/http-cache";
import { STATES } from "./lib/states";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // nodemailer talks to SMTP from the submit route. Leave it unbundled.
  serverExternalPackages: ["nodemailer"],
  images: {
    // Story photos are already sized WebP files in /public (about 840px, plus a 360px card file).
    // Cards use a plain <img> and srcSet. Leave this on: the image optimizer is a separate
    // usage line, and these files do not need another size generated per request.
    unoptimized: true,
  },
  async redirects() {
    return [
      ...STATES.map((state) => ({
        source: `/state/${state.code.toLowerCase()}`,
        destination: `/state/${state.slug}`,
        permanent: true,
      })),
      ...COUNTRIES.map((country) => ({
        source: `/country/${country.code.toLowerCase()}`,
        destination: `/country/${country.slug}`,
        permanent: true,
      })),
    ];
  },
  // No middleware.ts. A middleware function runs on every request, including static
  // HTML and images, and is billed as an edge invocation. Redirects here are routing
  // rules, not a function.
  async headers() {
    const cached = (source: string, cacheControl: string) => ({
      source,
      headers: [{ key: "Cache-Control", value: cacheControl }],
    });
    return [
      cached("/images/:path*", IMAGE_CACHE_CONTROL),
      cached("/rss.xml", FEED_CACHE_CONTROL),
      cached("/atom.xml", FEED_CACHE_CONTROL),
      cached("/smartnews.xml", FEED_CACHE_CONTROL),
      cached("/world/rss.xml", FEED_CACHE_CONTROL),
      cached("/kids/rss.xml", FEED_CACHE_CONTROL),
      cached("/category/:slug/rss.xml", FEED_CACHE_CONTROL),
      cached("/state/:slug/rss.xml", FEED_CACHE_CONTROL),
      cached("/week/rss.xml", FEED_CACHE_CONTROL),
      cached("/good-news-index/:month/index.csv", FEED_CACHE_CONTROL),
      cached("/country/:slug/rss.xml", FEED_CACHE_CONTROL),
      cached("/brand/:path*", IMAGE_CACHE_CONTROL),
      cached("/sitemap.xml", FEED_CACHE_CONTROL),
      cached("/robots.txt", FEED_CACHE_CONTROL),
      cached("/news-sitemap.xml", NEWS_SITEMAP_CACHE_CONTROL),
      cached("/publisher-logo.png", IMAGE_CACHE_CONTROL),
      cached("/icon", IMAGE_CACHE_CONTROL),
      cached("/apple-icon", IMAGE_CACHE_CONTROL),
      cached("/opengraph-image", IMAGE_CACHE_CONTROL),
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
