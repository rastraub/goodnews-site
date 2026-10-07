import type { Metadata } from "next";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${siteConfig.name} collects, and what it does not.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="page-block">
      <div className="wrap page-hero prose-page">
        <p className="kicker">Fine print</p>
        <h1>Privacy</h1>
        <p>
          {siteConfig.name} collects as little as it can. This page is plain language, not a lawyer&apos;s contract.
        </p>
        <h2>Email</h2>
        <p>
          If you join the Top 5 or the membership waitlist, we send your address to the email provider configured for this site. If no provider key is set, the address is written to the server log and is not added to a mailing list. We do not sell email addresses.
        </p>
        <h2>Story tips</h2>
        <p>
          Tips include your name, email, place, and what you sent. They are logged, saved to a local inbox when the server can write files, and forwarded to a webhook if the owner has set one.
        </p>
        <h2>Cheers</h2>
        <p>
          A cheer is stored in your browser so the button remembers you. The server only logs that a story was cheered. Counts on the page start from the number in the story file.
        </p>
        <h2>Contact</h2>
        <p>
          Questions go to <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
        </p>
      </div>
    </div>
  );
}
