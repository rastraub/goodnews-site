import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${siteConfig.name} collects, and what it does not.`,
  alternates: pageAlternates("/privacy"),
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
          Tips include your name, email, place, and what you sent. They are logged and saved to a local inbox when the server can write files. When mail delivery is configured, the tip is emailed to{" "}
          <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>. If a webhook is set, the same tip is sent there too.
        </p>
        <h2>Cheers</h2>
        <p>
          A cheer is stored in your browser so the button remembers you. The server only logs that a story was cheered. Counts on the page start from the number in the story file.
        </p>
        <h2>Good Neighbor</h2>
        <p>
          A Good Neighbor cheer stays in your browser, one per month, and is not sent to us. If shared voting is turned on, the server stores a hash of a random id from your browser and a count next to the story. It does not store your name, email, or IP address. A rate limit uses a hash of the network address, and that hash is not kept as a voter record. Totals can be public. Who voted is not.
        </p>
        <h2>Classrooms</h2>
        <p>
          The kids pages are for teachers and other adults to read with a class. The teacher email is a separate signup for educators. We do not ask for a child&apos;s name, age, school, or email. Those pages do not add advertising or any tracking beyond the rest of the site.
        </p>
        <h2>Contact</h2>
        <p>
          Questions go to <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
        </p>
      </div>
    </div>
  );
}
