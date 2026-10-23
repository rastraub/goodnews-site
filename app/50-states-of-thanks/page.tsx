import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { StoryCard } from "@/components/story-card";
import { ThanksMap } from "@/components/thanks-map";
import { toCard } from "@/lib/present";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { THANKS_PATH, THANKS_TITLE, thanksBoard, thanksDescription } from "@/lib/thanks";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

const CRUMBS = [
  { name: "Today", path: "/" },
  { name: "50 States of Thanks", path: THANKS_PATH },
];

export function generateMetadata(): Metadata {
  const board = thanksBoard();
  const description = thanksDescription(board.filled, board.total);
  return {
    ...listingMeta({
      title: THANKS_TITLE,
      description,
      base: THANKS_PATH,
      page: 1,
      total: 1,
    }),
    openGraph: {
      url: THANKS_PATH,
      title: THANKS_TITLE,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: THANKS_TITLE,
      description,
    },
  };
}

export default function ThanksPage() {
  const board = thanksBoard();
  const description = thanksDescription(board.filled, board.total);
  const filled = board.slots.filter((slot) => slot.story);

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: "50 States of Thanks",
          description,
          path: THANKS_PATH,
          crumbs: CRUMBS,
          stories: [],
          items: filled.flatMap((slot) =>
            slot.story ? [{ name: `${slot.state.name}: ${slot.story.title}`, path: `/story/${slot.story.slug}` }] : [],
          ),
          listLimit: board.total,
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>50 States of Thanks</span>
        </p>
        <p className="kicker">Thanksgiving 2026</p>
        <h1>50 States of Thanks.</h1>
        <p className="lede">
          Thanksgiving good news, gathered for November 26. One verified story of gratitude from every state and Washington, D.C.: kindness, neighbors helping neighbors, giving back, veterans, or a thank-you. The page updates with each morning edition, so an open state can fill in through the month. Good news from every state, with a way to help when the story has one.
        </p>
        <p className="meta">
          <span className="byline">
            By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          </span>
          <span className="thanks-count">
            {board.filled} of {board.total} filled
          </span>
        </p>
        <p className="link-pills">
          <Link href="/local">All states</Link>
          <Link href="/submit">Send a story</Link>
          <Link href="/help">Ways to help</Link>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 12 }}>
        <div className="shead">
          <div>
            <h2>Every state</h2>
            <p>Gold marks a story that is ready. A white state is still open.</p>
          </div>
        </div>
        <ThanksMap slots={board.slots} />
        <nav className="state-index thanks-index" aria-label="States">
          {board.slots.map((slot) => (
            <Link key={slot.state.code} href={`#thanks-${slot.state.slug}`} className={slot.story ? "has" : undefined}>
              <span>{slot.state.name}</span>
              <span className="count">{slot.story ? "Ready" : "Open"}</span>
            </Link>
          ))}
        </nav>
        <div className="thanks-board">
          {board.slots.map((slot) => (
            <article key={slot.state.code} id={`thanks-${slot.state.slug}`} className="thanks-slot">
              <h2>{slot.state.name}</h2>
              {slot.story ? (
                <StoryCard story={toCard(slot.story)} />
              ) : (
                <div className="thanks-ask">
                  <p>We are still looking for a gratitude story from here.</p>
                  <Link href="/submit">Know a story from {slot.state.name}? Send it to us</Link>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
