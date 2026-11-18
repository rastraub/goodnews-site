import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { KINDNESS_INDEX_PATH } from "@/lib/kindness";
import { listingMeta, webPageJsonLd } from "@/lib/seo";
import { CLASSROOM_INDEX_PATH } from "@/lib/classroom-pack";
import {
  SERVICE_HOURS_DESCRIPTION,
  SERVICE_HOURS_PATH,
  SERVICE_HOURS_TITLE,
  TEENS_INDEX_PATH,
  teensToPrerender,
} from "@/lib/teens";
import { siteConfig } from "@/site.config";
import { ServiceHoursLog } from "./log";

export const dynamic = "force-static";

const newest = () => teensToPrerender().slice().reverse();

export function generateMetadata(): Metadata {
  return listingMeta({
    title: SERVICE_HOURS_TITLE,
    description: SERVICE_HOURS_DESCRIPTION,
    base: SERVICE_HOURS_PATH,
    page: 1,
    total: 1,
  });
}

export default function ServiceHoursPage() {
  const weeks = newest().map((edition) => ({
    start: edition.start,
    label: edition.rangeLabel,
    stories: edition.stories.map((pick) => ({ slug: pick.story.slug, title: pick.story.title })),
  }));

  return (
    <div className="page-block">
      <JsonLd
        data={webPageJsonLd({
          name: SERVICE_HOURS_TITLE,
          description: SERVICE_HOURS_DESCRIPTION,
          path: SERVICE_HOURS_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Good News for Teens", path: TEENS_INDEX_PATH },
            { name: "Service hours", path: SERVICE_HOURS_PATH },
          ],
        })}
      />
      <div className="wrap page-hero hours-screen">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={TEENS_INDEX_PATH}>Good News for Teens</Link>
          <span aria-hidden="true">/</span>
          <span>Service hours</span>
        </p>
        <p className="kicker">For students and advisers</p>
        <h1>Service hours reflection.</h1>
        <p className="lede">
          A free log for volunteer or service-learning hours. Fill it in here, print one page, or photocopy the blank version. {siteConfig.name} does not ask for an email, an account, or a submission. Your school or organization decides what counts as service hours. {siteConfig.name} does not certify hours.
        </p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          {" · "}
          {siteConfig.owner.name}
        </p>
        <p className="link-pills">
          <Link href={TEENS_INDEX_PATH}>Good News for Teens</Link>
          <Link href={KINDNESS_INDEX_PATH}>Kindness Challenge</Link>
          <Link href={CLASSROOM_INDEX_PATH}>Good News Friday</Link>
        </p>
        <section className="pack-teacher" aria-labelledby="adviser-note">
          <h2 id="adviser-note">A note for advisers</h2>
          <p>
            The student writes the date, the activity, the organization, the hours, what they did, what they learned, and which story gave them the idea. The answers stay on their device until they clear them. There is no class roster and no upload. Use the printout the way your school already documents hours.
          </p>
        </section>
      </div>
      <ServiceHoursLog weeks={weeks} />
    </div>
  );
}
