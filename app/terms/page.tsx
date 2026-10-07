import type { Metadata } from "next";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "Terms",
  description: `How to use ${siteConfig.name}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="page-block">
      <div className="wrap page-hero prose-page">
        <p className="kicker">Fine print</p>
        <h1>Terms</h1>
        <p>
          Summaries on {siteConfig.name} are ours. The reporting belongs to the newsrooms we link. Photos belong to their photographers and are used under the license named on each story.
        </p>
        <p>
          Nothing here is professional, medical, or legal advice. Help links go to other organizations. We do not control what they do with a donation or a signup.
        </p>
        <p>
          Don&apos;t scrape the site in a way that breaks it, and don&apos;t send tips you know are false. We can refuse a tip or take a story down.
        </p>
      </div>
    </div>
  );
}
