import type { Metadata } from "next";
import Link from "next/link";
import { pageAlternates } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "Contact",
  description: `Reach the ${siteConfig.name} editor for a story tip, a correction, a press question, or a partnership.`,
  alternates: pageAlternates("/contact"),
};

export default function ContactPage() {
  const mail = siteConfig.contactEmail;
  return (
    <div className="page-block">
      <div className="wrap page-hero prose-page">
        <p className="kicker">Hello</p>
        <h1>Contact</h1>
        <p className="lede">
          The {siteConfig.editor.name} reads the mail. Write <a href={`mailto:${mail}`}>{mail}</a>.
        </p>
        <h2>Story tips</h2>
        <p>
          The <Link href="/submit">submission form</Link> is the fastest way to send a neighbor, a clinic, a rescue, or a town. Include a link to a news report if you have one. We publish only what we can verify.
        </p>
        <h2>Corrections</h2>
        <p>
          If a summary is wrong, email <a href={`mailto:${mail}?subject=Correction`}>{mail}</a> with the story link and what we should fix. The policy, and every correction we have published, is on the <Link href="/corrections">corrections page</Link>.
        </p>
        <h2>Press and partnerships</h2>
        <p>
          Press questions come to the same address. Partnership ideas start at <Link href="/partner">partner with us</Link>. Sponsors do not pick the stories. The rules are on <Link href="/editorial-standards">editorial standards</Link>.
        </p>
        <h2>Privacy</h2>
        <p>
          Questions about an email address or a tip you sent: <a href={`mailto:${mail}`}>{mail}</a>. The plain-language policy is on the <Link href="/privacy">privacy page</Link>.
        </p>
        <p style={{ marginTop: 18 }}>
          <Link className="btn btn-ink" href="/submit">Submit a story</Link>
        </p>
      </div>
    </div>
  );
}
