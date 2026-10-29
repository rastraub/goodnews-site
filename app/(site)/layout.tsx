import type { Metadata } from "next";
import { SiteFrame } from "@/components/site-frame";
import { editionLabel } from "@/lib/format";
import { fontClassName } from "../fonts";
import { FAVICON_SIZES, faviconPath } from "@/lib/brand";
import { pageAlternates, xHandle } from "@/lib/seo";
import { siteConfig } from "@/site.config";
import "../globals.css";

const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
const bingVerification = process.env.BING_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} · ${siteConfig.seoTitle}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: pageAlternates("/"),
  authors: [{ name: siteConfig.editor.name, url: "/about#masthead" }],
  creator: siteConfig.editor.name,
  publisher: siteConfig.name,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: "en_US",
    description: siteConfig.description,
  },
  twitter: { card: "summary_large_image", site: xHandle() },
  icons: {
    icon: FAVICON_SIZES.map((size) => ({
      url: faviconPath(size),
      sizes: `${size}x${size}`,
      type: "image/png" as const,
    })),
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
  ...(googleVerification || bingVerification
    ? {
        verification: {
          ...(googleVerification ? { google: googleVerification } : {}),
          ...(bingVerification ? { other: { "msvalidate.01": bingVerification } } : {}),
        },
      }
    : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteFrame lang="en" className={fontClassName} skipLabel="Skip to stories" edition={editionLabel()}>
      {children}
    </SiteFrame>
  );
}
