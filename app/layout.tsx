import type { Metadata } from "next";
import localFont from "next/font/local";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { IconSprite } from "@/components/icon-sprite";
import { JsonLd } from "@/components/json-ld";
import { editionLabel } from "@/lib/format";
import { pageAlternates, siteGraphJsonLd, xHandle } from "@/lib/seo";
import { siteConfig } from "@/site.config";
import "./globals.css";

const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
const bingVerification = process.env.BING_SITE_VERIFICATION?.trim();

const inter = localFont({
  src: [{ path: "../assets/fonts/Inter-Variable.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-inter",
  display: "swap",
});

const interItalic = localFont({
  src: [{ path: "../assets/fonts/Inter-Italic-Variable.woff2", weight: "100 900", style: "italic" }],
  variable: "--font-inter-italic",
  display: "swap",
  preload: false,
});

const fraunces = localFont({
  src: [
    { path: "../assets/fonts/Fraunces-600.woff2", style: "normal", weight: "600" },
    { path: "../assets/fonts/Fraunces-Italic.woff2", style: "italic", weight: "600" },
  ],
  variable: "--font-fraunces",
  display: "swap",
});

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
    <html lang="en" className={`${inter.variable} ${interItalic.variable} ${fraunces.variable}`}>
      <body>
        <JsonLd data={siteGraphJsonLd()} />
        <IconSprite />
        <a className="skip" href="#main">
          Skip to stories
        </a>
        <Header edition={editionLabel()} />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
