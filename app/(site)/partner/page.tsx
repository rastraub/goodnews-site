import type { Metadata } from "next";
import Link from "next/link";
import { pageAlternates } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "Partner with us",
  description: "Sponsorships are labeled. The news is not for sale.",
  alternates: pageAlternates("/partner"),
};

export default function PartnerPage() {
  return (
    <div className="page-block">
      <div className="wrap page-hero prose-page">
        <p className="kicker">Join in</p>
        <h1>Partner with us.</h1>
        <p className="lede">
          A sponsor can underwrite the daily Top 5 or a clearly labeled kindness series. The news stays independent. Readers will always be able to tell a partnership from a story.
        </p>
        <p>
          Write <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a> with the idea and the place you care about.
        </p>
        <p>
          If a story already covered your newsroom, nonprofit, school, or reporting, that is separate from a sponsorship. The badge and the embed code are on <Link href="/featured">featured on {siteConfig.name}</Link>.
        </p>
      </div>
    </div>
  );
}
