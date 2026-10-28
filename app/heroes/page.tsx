import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { heroStateCodes, isHometownHero, responderTypesFor } from "@/lib/heroes";
import { toCard } from "@/lib/present";
import { listingJsonLd, pageAlternates } from "@/lib/seo";
import { getPublishedStories } from "@/lib/stories";
import { siteConfig } from "@/site.config";
import { HeroesBrowse, type HeroListing } from "./browse";

const TITLE = "Hometown Heroes";
const DESCRIPTION =
  "Rescues, medical saves, and kindness from firefighters, police officers, EMTs, paramedics, 911 dispatchers, and search-and-rescue teams. Each story is checked and linked to the original report.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: pageAlternates("/heroes"),
};

function listings(): HeroListing[] {
  return getPublishedStories()
    .filter((story) => isHometownHero(story.tags))
    .map((story) => ({
      card: toCard(story),
      country: story.country,
      states: heroStateCodes(story),
      types: responderTypesFor(story.tags),
    }));
}

export default function HeroesPage() {
  const stories = listings();
  return (
    <>
      <JsonLd
        data={listingJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          path: "/heroes",
          crumbs: [
            { name: "Today", path: "/" },
            { name: TITLE, path: "/heroes" },
          ],
          stories: stories.map((story) => ({ slug: story.card.slug, title: story.card.title })),
        })}
      />
      <div className="page-block" style={{ paddingBottom: 0 }}>
        <div className="wrap page-hero">
          <p className="crumbs">
            <Link href="/">Today</Link>
            <span aria-hidden="true">/</span>
            <span>{TITLE}</span>
          </p>
          <p className="kicker">First responders</p>
          <h1>Hometown Heroes</h1>
          <p className="lede">{DESCRIPTION}</p>
          <p className="byline" style={{ marginTop: 14 }}>
            By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          </p>
        </div>
        <Suspense fallback={<p className="wrap empty-note">Loading stories…</p>}>
          <HeroesBrowse stories={stories} />
        </Suspense>
      </div>
      <EmailSignup id="heroes-email" />
    </>
  );
}
