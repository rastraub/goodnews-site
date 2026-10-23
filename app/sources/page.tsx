import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SourceInvite } from "@/components/source-invite";
import { SourcesBrowser, type SourceFilter, type SourceListItem } from "@/components/sources-browser";
import { formatStoryDate } from "@/lib/format";
import { getOutlets } from "@/lib/outlets";
import { listingJsonLd, pageAlternates } from "@/lib/seo";
import { STATES } from "@/lib/states";
import { siteConfig } from "@/site.config";

const TITLE = "The newsrooms behind the good news";
const DESCRIPTION = `The newsrooms credited on ${siteConfig.name}, with every story that cites them and a link back to each site.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: pageAlternates("/sources"),
};

export default function SourcesPage() {
  const outlets = getOutlets();
  const items: SourceListItem[] = outlets.map((outlet) => ({
    slug: outlet.slug,
    name: outlet.name,
    domain: outlet.domain,
    homepage: outlet.homepage,
    count: outlet.count,
    hasPage: outlet.hasPage,
    places: [
      ...outlet.states.map((state) => ({ label: state.name, href: `/state/${state.slug}` })),
      ...outlet.countries.map((country) => ({ label: country.name, href: `/country/${country.slug}` })),
    ],
    stateCodes: outlet.states.map((state) => state.code),
    outsideUs: outlet.countries.length > 0,
    aliases: outlet.aliases,
    stories: outlet.stories.map((story) => ({
      slug: story.slug,
      title: story.title,
      dateLabel: formatStoryDate(story.date),
    })),
  }));

  const filters: SourceFilter[] = [{ id: "all", label: "All newsrooms", count: outlets.length }];
  for (const state of STATES) {
    const count = outlets.filter((outlet) => outlet.states.some((item) => item.code === state.code)).length;
    if (count) filters.push({ id: state.code, label: state.name, count });
  }
  const worldCount = outlets.filter((outlet) => outlet.countries.length > 0).length;
  if (worldCount) filters.push({ id: "world", label: "Outside the United States", count: worldCount });

  const withPage = outlets.filter((outlet) => outlet.hasPage).length;
  const placeSummary = outlets.length
    ? `${outlets.length} newsrooms. ${withPage} of them have more than one story here, and each of those has its own page.`
    : "Newsrooms will show up here as soon as a published story credits them.";

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          path: "/sources",
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Newsrooms", path: "/sources" },
          ],
          stories: [],
          items: outlets.flatMap((outlet) => {
            const path = outlet.pagePath ?? (outlet.stories[0] ? `/story/${outlet.stories[0].slug}` : "");
            return path ? [{ name: outlet.name, path }] : [];
          }),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Newsrooms</span>
        </p>
        <p className="kicker">Sources</p>
        <h1>The newsrooms behind the good news.</h1>
        <p className="lede">
          The outlets below did the reporting. We read it, write a short summary, and link the original article. This is a thank-you to those local newsrooms, and to the other desks we cite, sorted by how many stories we have credited. {placeSummary}
        </p>
        <SourceInvite />
      </div>
      <div className="wrap">
        <SourcesBrowser outlets={items} filters={filters} />
      </div>
    </div>
  );
}
