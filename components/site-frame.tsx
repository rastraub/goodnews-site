import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { Footer } from "./footer";
import { Header } from "./header";
import { IconSprite } from "./icon-sprite";
import { JsonLd } from "./json-ld";
import { siteGraphJsonLd } from "@/lib/seo";
import { gaMeasurementId } from "@/site.config";

/**
 * Shared document shell. English and Spanish are separate root layouts so each
 * page can set `<html lang>` without a request-time lookup.
 * On Spanish pages the chrome stays English and is marked `lang="en"`.
 */
export function SiteFrame({
  lang,
  className,
  skipLabel,
  edition,
  quizHref,
  children,
}: {
  lang: "en" | "es";
  className: string;
  skipLabel: string;
  edition: string;
  quizHref?: string;
  children: ReactNode;
}) {
  const header = <Header edition={edition} quizHref={quizHref} />;
  const footer = <Footer />;
  const gaId = gaMeasurementId();
  return (
    <html lang={lang} className={className}>
      <body>
        {gaId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive">{`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', ${JSON.stringify(gaId)});`}</Script>
          </>
        ) : null}
        <Analytics />
        <JsonLd data={siteGraphJsonLd()} />
        <IconSprite />
        <a className="skip" href="#main">
          {skipLabel}
        </a>
        {lang === "es" ? <div lang="en">{header}</div> : header}
        <main id="main">{children}</main>
        {lang === "es" ? <div lang="en">{footer}</div> : footer}
      </body>
    </html>
  );
}
