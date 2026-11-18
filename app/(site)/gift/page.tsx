import type { Metadata } from "next";
import Link from "next/link";
import { CopyLink } from "@/components/copy-link";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { PrintButton } from "@/app/(site)/kids/print-button";
import { QrCode } from "@/components/qr-code";
import {
  GIFT_DESCRIPTION,
  GIFT_PATH,
  GIFT_TITLE,
  giftClipboard,
  giftMailto,
  giftMessages,
  giftSeason,
  giftSignupUrl,
  giftSms,
} from "@/lib/gift";
import { giftJsonLd, pageAlternates, xHandle } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

const signupUrl = giftSignupUrl();

export const metadata: Metadata = {
  title: GIFT_TITLE,
  description: GIFT_DESCRIPTION,
  alternates: pageAlternates(GIFT_PATH),
  openGraph: {
    url: GIFT_PATH,
    title: GIFT_TITLE,
    description: GIFT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    site: xHandle(),
    title: GIFT_TITLE,
    description: GIFT_DESCRIPTION,
  },
};

export default function GiftPage() {
  const messages = giftMessages(signupUrl);
  const season = giftSeason();

  return (
    <div className="page-block gift-page">
      <JsonLd data={giftJsonLd({ name: GIFT_TITLE, description: GIFT_DESCRIPTION, path: GIFT_PATH })} />
      <div className="wrap page-hero">
        <p className="crumbs no-print">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Gift the good news</span>
        </p>
        <p className="kicker no-print">For readers</p>
        <h1 className="no-print">Gift the good news.</h1>
        <p className="lede no-print">
          Give a friend or relative the free daily Top 5 from {siteConfig.name}. The buttons open your own email or text app with a note already written. You add their address. We never see it, and we do not send the message.
        </p>
        {season ? (
          <p className="lede no-print">
            From November 20 through New Year&apos;s Eve, this is an easy gift to tuck into a card or send on a quiet evening. The email is still free. There is nothing to buy.
          </p>
        ) : (
          <p className="lede no-print">The note is warm in any month. Print the card if you would rather hand it to someone.</p>
        )}
        <p className="byline no-print" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>

        <div className="gift-messages no-print">
          {messages.map((message) => (
            <section key={message.id} aria-labelledby={`gift-${message.id}`}>
              <h2 id={`gift-${message.id}`}>{message.label}</h2>
              <p className="teacher-note">{message.note}</p>
              <blockquote className="gift-note">
                <p className="gift-subject">Subject: {message.subject}</p>
                {message.body.split("\n\n").map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </blockquote>
              <div className="gift-actions">
                <a className="btn btn-ink" href={giftMailto(message)}>
                  Open email
                </a>
                <a className="btn btn-outline" href={giftSms(message)}>
                  Open text
                </a>
                <CopyLink value={giftClipboard(message)} label="Copy message" />
              </div>
            </section>
          ))}
        </div>

        <section className="gift-print-block" aria-labelledby="gift-card-heading">
          <div className="no-print">
            <h2 id="gift-card-heading">Printable gift card</h2>
            <p>
              One page, meant to fold in half and slip into a holiday card. The signup address is printed in type. The square is a QR code for the same page, drawn here when the site is built. Nothing is sent to a print service.
            </p>
            <div className="pack-actions">
              <PrintButton label="Print the gift card" />
            </div>
          </div>
          <article className="gift-sheet" aria-label="Fold-in-half gift card">
            <div className="gift-half gift-front">
              <p className="kicker">{siteConfig.name}</p>
              <h2>A gift of good news.</h2>
              <p>Five true stories, each morning, for someone you care about. Free. About two minutes. No politics.</p>
            </div>
            <p className="gift-fold">Fold here</p>
            <div className="gift-half gift-back">
              <h2>The daily Top 5</h2>
              <p>Sign up with your own email. The list is free, and you can leave whenever you want.</p>
              <p className="gift-url">
                <a href={signupUrl}>{signupUrl}</a>
              </p>
              <QrCode value={signupUrl} label={`QR code for the ${siteConfig.name} newsletter signup`} />
              <p className="gift-fine">From {siteConfig.editor.name}. We do not collect the recipient&apos;s address.</p>
            </div>
          </article>
        </section>
      </div>
      <div className="no-print">
        <EmailSignup id="gift-signup" showGiftLink={false} />
      </div>
    </div>
  );
}
