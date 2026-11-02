import type { Metadata } from "next";
import Link from "next/link";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { ShareButtons } from "@/components/share-buttons";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { THANKS_PATH } from "@/lib/thanks";
import {
  CLASSROOM_NOTE,
  GRATITUDE_ROUND,
  LANE_LABEL,
  TABLE_TALK_PATH,
  TABLE_TALK_SHARE,
  TABLE_TALK_TITLE,
  tableTalkDeck,
  tableTalkDescription,
  thanksgivingLabel,
} from "@/lib/table-talk";
import { calendarObservancePath } from "@/lib/good-news-calendar";
import { siteConfig } from "@/site.config";
import { TableTalkDeck } from "./deck";

export const dynamic = "force-static";

const CRUMBS = [
  { name: "Today", path: "/" },
  { name: TABLE_TALK_TITLE, path: TABLE_TALK_PATH },
];

export function generateMetadata(): Metadata {
  const deck = tableTalkDeck();
  const description = tableTalkDescription(deck.year, deck.cards.length);
  return {
    ...listingMeta({
      title: TABLE_TALK_TITLE,
      description,
      base: TABLE_TALK_PATH,
      page: 1,
      total: 1,
    }),
    openGraph: {
      url: TABLE_TALK_PATH,
      title: TABLE_TALK_TITLE,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: TABLE_TALK_TITLE,
      description,
    },
  };
}

export default function TableTalkPage() {
  const deck = tableTalkDeck();
  const description = tableTalkDescription(deck.year, deck.cards.length);
  const holiday = thanksgivingLabel(deck.year);
  const cards = deck.cards.map((card) => ({
    slug: card.story.slug,
    laneLabel: LANE_LABEL[card.lane],
    place: card.place,
    summary: card.summary,
    question: card.question,
    href: `/story/${card.story.slug}`,
  }));

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: TABLE_TALK_TITLE,
          description,
          path: TABLE_TALK_PATH,
          crumbs: CRUMBS,
          stories: [],
          items: deck.cards.map((card) => ({
            name: card.story.title,
            path: `/story/${card.story.slug}`,
          })),
        })}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Gratitude round",
          description: "A short way to use Good News Table Talk cards at a table or in a classroom.",
          totalTime: "PT10M",
          step: GRATITUDE_ROUND.map((text, index) => ({
            "@type": "HowToStep",
            position: index + 1,
            name: `Step ${index + 1}`,
            text,
          })),
        }}
      />
      <div className="wrap page-hero no-print">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>{TABLE_TALK_TITLE}</span>
        </p>
        <p className="kicker">Thanksgiving {deck.year}</p>
        <h1>Good News Table Talk.</h1>
        <p className="lede">
          Printable conversation cards for {holiday}. Each card is a real story from the archive: a short summary, one question, and a link to the full report. Pass a card at the table and talk about that, instead of arguing about the news.
        </p>
        <p className="lede">
          This address stays the same each year. The cards are chosen again from stories already on the site, so a later Thanksgiving can reuse the page. Summaries are copied from the classroom text. The question is a prompt. It does not add facts.
        </p>
        <p className="meta">
          <span className="byline">
            By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          </span>
        </p>
        <p className="link-pills">
          <Link href={THANKS_PATH}>50 States of Thanks</Link>
          <Link href={calendarObservancePath("thanksgiving")}>Thanksgiving on the calendar</Link>
          <Link href="/kids">For classrooms</Link>
          <Link href="/kids/print">Story of the Day</Link>
        </p>
      </div>
      <div className="wrap no-print">
        <section className="classroom-box" id="gratitude-round">
          <h2>A gratitude round</h2>
          <p>Ten minutes is enough. Skip any card that does not fit your table.</p>
          <ol>
            {GRATITUDE_ROUND.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
        <section className="classroom-box" id="classroom">
          <h2>For classrooms</h2>
          <p>{CLASSROOM_NOTE}</p>
        </section>
        <div className="tt-share">
          <h2>Share the cards</h2>
          <ShareButtons title={TABLE_TALK_TITLE} path={TABLE_TALK_PATH} text={TABLE_TALK_SHARE} />
        </div>
      </div>
      <div className="wrap">
        <TableTalkDeck cards={cards} />
      </div>
      <div className="no-print">
        <EmailSignup id="table-talk-email" />
      </div>
    </div>
  );
}
