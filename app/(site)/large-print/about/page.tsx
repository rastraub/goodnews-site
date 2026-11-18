import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import {
  LARGE_PRINT_ABOUT_PATH,
  LARGE_PRINT_PATH,
  indexableLargePrintEditions,
  largePrintDateLabel,
  largePrintEditionTitle,
  listLargePrintEditions,
  pickFeaturedLargePrint,
} from "@/lib/large-print";
import { listingJsonLd, pageAlternates } from "@/lib/seo";
import { mountainDay } from "@/lib/weeks";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

const TITLE = "Large-print good news, for groups";
const DESCRIPTION = `How senior centers, libraries, and caregivers can print and share the free large-print edition from ${siteConfig.name}. A new sheet each morning.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: pageAlternates(LARGE_PRINT_ABOUT_PATH),
};

export default function LargePrintAboutPage() {
  const today = mountainDay();
  const editions = listLargePrintEditions();
  const featured = pickFeaturedLargePrint(editions, today);
  const recent = indexableLargePrintEditions(editions).slice(0, 14);

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          path: LARGE_PRINT_ABOUT_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Large print", path: LARGE_PRINT_PATH },
            { name: "For groups", path: LARGE_PRINT_ABOUT_PATH },
          ],
          stories: [],
          items: recent.map((edition) => ({
            name: largePrintEditionTitle(edition.date),
            path: edition.path,
          })),
        })}
      />
      <div className="wrap page-hero lp-page">
        <p className="crumbs no-print">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={LARGE_PRINT_PATH}>Large print</Link>
          <span aria-hidden="true">/</span>
          <span>For groups</span>
        </p>
        <article className="lp-about">
          <p className="lp-mast">{siteConfig.name}</p>
          <h1>For activity directors and librarians.</h1>
          <p className="lp-lead">
            The large-print edition is a one- or two-page sheet of good news. It is for senior centers, assisted-living activity programs, public libraries, hospital waiting rooms, and caregivers who want something uplifting to hand out or read aloud.
          </p>
          <h2>Free to print and share</h2>
          <p>
            Print the sheet, copy it, or read it to a group. There is no fee and no account. Please keep the source line and the site address on copies you post.
          </p>
          <h2>How often it updates</h2>
          <p>
            A new edition is published each morning, on the same schedule as the daily edition, including weekends. Each sheet lists up to five stories from that day. A morning with too few stories still has a page, and that short page is left out of search results.
          </p>
          <h2>What is on the sheet</h2>
          <p>
            Each story shows the headline, a short summary already published with the story, the city and state, and the newsroom that reported it. The sheet uses the same checks as the classroom read-aloud. It skips politics, violence, and stories that are not a fit to read in a group.
          </p>
          <h2>The daily email</h2>
          <p>
            The morning Top 5 also goes out by email. The signup is on the <Link href="/subscribe">daily email page</Link>. It is free, and the address is never sold.
          </p>
          <h2>Story tips and questions</h2>
          <p>
            The <Link href="/submit">submission form</Link> is the way to send a story tip. Questions and corrections go through the <Link href="/contact">contact page</Link>. The mailbox is{" "}
            <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
          </p>
          {featured ? (
            <p className="lp-actions">
              <Link className="btn btn-ink" href={featured.date === today ? LARGE_PRINT_PATH : featured.path}>
                Open the latest sheet
              </Link>
            </p>
          ) : null}
        </article>
        {recent.length ? (
          <nav className="lp-dates" aria-label="Recent editions">
            <h2>Recent editions</h2>
            <ul>
              {recent.map((edition) => (
                <li key={edition.date}>
                  <Link href={edition.path}>
                    <span>{largePrintDateLabel(edition.date)}</span>
                    <span>{edition.stories.length} stories</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
