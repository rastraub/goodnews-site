import Link from "next/link";
import { siteConfig } from "@/site.config";

export function SourceInvite() {
  return (
    <aside className="source-cta">
      <div>
        <p className="kicker">For newsrooms</p>
        <p>
          If {siteConfig.name} credited your reporting, you can take a badge or embed the headline widget. A bulletin or newsletter can republish the summary, with credit, from the <Link href="/wire">Good News Wire</Link>.
        </p>
      </div>
      <Link className="btn btn-ink" href="/featured">
        Badge and headline widget
      </Link>
    </aside>
  );
}
