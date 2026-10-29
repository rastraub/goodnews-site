import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { fontClassName } from "./fonts";
import { editionLabel } from "@/lib/format";
import { siteConfig } from "@/site.config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return (
    <SiteFrame lang="en" className={fontClassName} skipLabel="Skip to stories" edition={editionLabel()}>
      <div className="page-block">
        <div className="wrap page-hero">
          <p className="kicker">404</p>
          <h1>That page wandered off.</h1>
          <p className="lede">The story may have moved, or the link is off by a letter.</p>
          <p style={{ marginTop: 18 }}>
            <Link className="btn btn-ink" href="/">
              Back to today
            </Link>
          </p>
        </div>
      </div>
    </SiteFrame>
  );
}
