import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { LargePrintSheet } from "@/components/large-print-sheet";
import { openGraphImage } from "@/lib/feed-image";
import {
  LARGE_PRINT_PATH,
  indexableLargePrintEditions,
  largePrintEditionTitle,
  listLargePrintEditions,
  pickFeaturedLargePrint,
} from "@/lib/large-print";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { mountainDay } from "@/lib/weeks";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

const INDEX_DESCRIPTION = `A free large-print sheet of good news for senior centers, libraries, hospital waiting rooms, and caregivers. ${siteConfig.name} publishes a new edition each morning.`;

export function generateMetadata(): Metadata {
  const today = mountainDay();
  const edition = pickFeaturedLargePrint(listLargePrintEditions(), today);
  const title = edition ? largePrintEditionTitle(edition.date) : "Large-Print Good News for Seniors";
  const image = edition?.stories[0];
  return listingMeta({
    title,
    description: INDEX_DESCRIPTION,
    base: LARGE_PRINT_PATH,
    page: 1,
    total: 1,
    image: image ? openGraphImage(image) : undefined,
  });
}

export default function LargePrintIndexPage() {
  const today = mountainDay();
  const editions = listLargePrintEditions();
  const edition = pickFeaturedLargePrint(editions, today);
  const indexable = indexableLargePrintEditions(editions);

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: edition ? largePrintEditionTitle(edition.date) : "Large-Print Good News for Seniors",
          description: INDEX_DESCRIPTION,
          path: LARGE_PRINT_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Large print", path: LARGE_PRINT_PATH },
          ],
          stories: [],
          items: indexable.map((item) => ({
            name: largePrintEditionTitle(item.date),
            path: item.path,
          })),
        })}
      />
      {edition ? (
        <LargePrintSheet edition={edition} today={today} landing editions={editions} />
      ) : (
        <div className="wrap page-hero lp-page">
          <h1>Large-print good news for seniors.</h1>
          <p className="lp-lead">No edition is ready yet. A sheet appears when the morning edition has stories.</p>
        </div>
      )}
    </div>
  );
}
