import type { Metadata } from "next";
import Link from "next/link";
import { pageAlternates } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "Editorial standards",
  description: `How ${siteConfig.name} chooses, checks, corrects, and labels stories. Every story is checked against its original report. Editors review published stories and correct errors in public.`,
  alternates: pageAlternates("/editorial-standards"),
};

export default function EditorialStandardsPage() {
  return (
    <div className="page-block">
      <div className="wrap page-hero prose-page">
        <p className="crumbs">
          <Link href="/about">About</Link>
          <span aria-hidden="true">/</span>
          <span>Editorial standards</span>
        </p>
        <p className="kicker">Our promise</p>
        <h1>Editorial standards</h1>
        <p className="lede">
          {siteConfig.name} publishes short, verified summaries of good news. These are the rules used before a story goes up, and after one needs a fix.
        </p>

        <h2>What we publish</h2>
        <p>
          We look for true, hopeful stories from the United States and from other countries: neighbors, rescuers, animals, classrooms, clinics, and scientific or medical advances that are already helping people or have been shown in human trials. We skip rumors, fundraising appeals with no reported outcome, and anything whose goodness depends on a political side. The same check applies outside the United States. A story still needs a reputable report, a real place, and a summary that matches that report.
        </p>
        <p>
          The no-politics rule is absolute. Candidates, parties, elections, legislation, and culture-war topics stay out, even when the ending sounds happy. The plain-language version lives on the <Link href="/about#no-politics">about page</Link>.
        </p>

        <h2>Verification</h2>
        <ul>
          <li>Every published story names the original newsroom and links to the report.</li>
          <li>Names, places, numbers, and quotations in our summary have to appear in that report. We do not invent quotes or fill gaps from memory.</li>
          <li>A second source is welcome. It is not a substitute for reading the one we cite.</li>
          <li>{siteConfig.verification}</li>
        </ul>

        <h2>Bylines</h2>
        <p>
          Stories are staff summaries and carry the byline of the {siteConfig.editor.name}. The original reporting belongs to the newsroom we link. We do not present that newsroom&apos;s work as our own investigation.
        </p>

        <h2>Headlines and dates</h2>
        <p>
          The headline should be something the original newsroom would recognize. We do not exaggerate a number, a rescue, or a recovery. Each story shows the publication date. If we later correct it, the correction note stays on the story.
        </p>

        <h2>Photos</h2>
        <p>
          A photograph is illustrative unless its caption says it shows the people, animals, or place in the story. Captions name the photographer and the license, and they say when the picture is not of the subject.
        </p>

        <h2>Corrections</h2>
        <p>
          If a summary is wrong, we correct the story in public and list the correction on the <Link href="/corrections">corrections page</Link>. We do not quietly rewrite the past. To ask for a correction, write <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a> with the story link, the sentence you believe is wrong, and a source for the fix. We read every request.
        </p>
        <p>
          If the original newsroom updates its story, we update our summary to match and say so when the change is material. If the original report was wrong and we repeated it accurately, we still correct our summary once the record is clear, and we note it.
        </p>

        <h2>Independence</h2>
        <p>
          Sponsors, if we have them, are labeled and do not select stories. Membership, when billing opens, does not buy coverage. Help links on a story go to the organization named in the reporting, not to us.
        </p>

        <h2>How to reach us</h2>
        <p>
          Email the {siteConfig.editor.name} at <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a> or use the <Link href="/contact">contact page</Link>. A story tip is faster through the <Link href="/submit">submission form</Link>.
        </p>
      </div>
    </div>
  );
}
