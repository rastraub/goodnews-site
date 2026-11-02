"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { siteConfig } from "@/site.config";

export type TableTalkCardModel = {
  slug: string;
  laneLabel: string;
  place: string;
  summary: string;
  question: string;
  href: string;
};

function Card({ card, featured = false }: { card: TableTalkCardModel; featured?: boolean }) {
  return (
    <article className={featured ? "tt-card is-featured" : "tt-card"} id={featured ? undefined : `card-${card.slug}`}>
      <p className="tt-kicker">
        <span>{card.laneLabel}</span>
        <span>{card.place}</span>
      </p>
      <p className="tt-summary">{card.summary}</p>
      <p className="tt-question">
        <span>Ask</span>
        {card.question}
      </p>
      <p className="tt-foot">
        <Link href={card.href}>Full story</Link>
        <span className="tt-url">{`${siteConfig.url}${card.href}`}</span>
      </p>
    </article>
  );
}

export function TableTalkDeck({ cards }: { cards: TableTalkCardModel[] }) {
  const [order, setOrder] = useState<string[]>(() => cards.map((card) => card.slug));
  const [paper, setPaper] = useState<"letter" | "a4">("letter");
  const [up, setUp] = useState<6 | 8>(6);
  const [drawn, setDrawn] = useState<string | null>(null);
  const [note, setNote] = useState("Dashed lines are cut lines. Choose US Letter or A4 before you print.");

  const bySlug = useMemo(() => new Map(cards.map((card) => [card.slug, card])), [cards]);
  const ordered = order.flatMap((slug) => {
    const card = bySlug.get(slug);
    return card ? [card] : [];
  });
  const pages: TableTalkCardModel[][] = [];
  for (let index = 0; index < ordered.length; index += up) pages.push(ordered.slice(index, index + up));
  const drawnCard = drawn ? bySlug.get(drawn) : undefined;

  function shuffle() {
    const next = [...order];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      const current = next[index]!;
      next[index] = next[swap]!;
      next[swap] = current;
    }
    setOrder(next);
    setNote("Cards shuffled. Print follows this order.");
  }

  function restore() {
    setOrder(cards.map((card) => card.slug));
    setDrawn(null);
    setNote("Cards are back in the original order.");
  }

  function draw() {
    if (!order.length) return;
    const slug = order[Math.floor(Math.random() * order.length)];
    if (!slug) return;
    setDrawn(slug);
    setNote("A card was drawn.");
  }

  return (
    <div className="tt">
      <div className="tt-controls no-print">
        <button type="button" className="btn btn-ink" onClick={shuffle}>
          Shuffle
        </button>
        <button type="button" className="btn btn-outline" onClick={draw}>
          Random card
        </button>
        <button type="button" className="btn btn-outline" onClick={() => window.print()}>
          Print cards
        </button>
        <button type="button" className="btn btn-outline" onClick={restore}>
          Original order
        </button>
        <fieldset>
          <legend>Paper</legend>
          <button type="button" className={paper === "letter" ? "on" : undefined} aria-pressed={paper === "letter"} onClick={() => setPaper("letter")}>
            US Letter
          </button>
          <button type="button" className={paper === "a4" ? "on" : undefined} aria-pressed={paper === "a4"} onClick={() => setPaper("a4")}>
            A4
          </button>
        </fieldset>
        <fieldset>
          <legend>Per page</legend>
          <button type="button" className={up === 6 ? "on" : undefined} aria-pressed={up === 6} onClick={() => setUp(6)}>
            6
          </button>
          <button type="button" className={up === 8 ? "on" : undefined} aria-pressed={up === 8} onClick={() => setUp(8)}>
            8
          </button>
        </fieldset>
      </div>
      <p className="tt-note no-print" role="status">
        {note}
      </p>
      {drawnCard ? (
        <div className="tt-draw no-print">
          <p className="kicker">Your card</p>
          <Card card={drawnCard} featured />
          <button type="button" className="btn btn-outline" onClick={draw}>
            Draw another
          </button>
        </div>
      ) : null}
      <div className="tt-print">
        {pages.map((page, index) => (
          <div className="tt-page-block" key={page.map((card) => card.slug).join("-")}>
            <p className="tt-page no-print">
              Print page {index + 1} of {pages.length}
            </p>
            <section className="tt-sheet" data-paper={paper} data-up={up} aria-label={`Cards, print page ${index + 1}`}>
              {page.map((card) => (
                <Card key={card.slug} card={card} />
              ))}
            </section>
          </div>
        ))}
      </div>
    </div>
  );
}
