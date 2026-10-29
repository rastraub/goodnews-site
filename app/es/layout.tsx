import type { Metadata } from "next";
import { SiteFrame } from "@/components/site-frame";
import { fontClassName } from "../fonts";
import { editionLabel } from "@/lib/format";
import { FAVICON_SIZES, faviconPath } from "@/lib/brand";
import { pageAlternates, xHandle } from "@/lib/seo";
import { spanishLandingDescription } from "@/lib/spanish-editions";
import { siteConfig } from "@/site.config";
import "../globals.css";

const description = spanishLandingDescription();

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} · Buenas noticias en español`,
    template: `%s · ${siteConfig.name}`,
  },
  description,
  applicationName: siteConfig.name,
  alternates: pageAlternates("/es", "/es/rss.xml", { es: "/es", "x-default": "/es" }),
  publisher: siteConfig.name,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: "es_LA",
    alternateLocale: ["en_US"],
    description,
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
};

export default function SpanishLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteFrame lang="es" className={fontClassName} skipLabel="Saltar a las noticias" edition={editionLabel()}>
      {children}
    </SiteFrame>
  );
}
