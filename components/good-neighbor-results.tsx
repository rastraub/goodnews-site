"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StoryImage } from "@/components/story-image";

type WinnerCard = {
  month: string;
  slug: string;
  label: string;
  href: string;
  title: string;
  dek: string;
  place: string;
  image: string;
  imageAlt: string;
  imageTreatment: "none" | "warm";
};

type NomineePeek = {
  slug: string;
  title: string;
  dek: string;
  place: string;
  image: string;
  imageAlt: string;
  imageTreatment: "none" | "warm";
};

type BallotPeek = {
  month: string;
  label: string;
  href: string;
  nominees: NomineePeek[];
};

/**
 * When shared votes are on, totals live in the API. The server HTML already
 * includes an editor pick or a file-store winner. This fills in the rest
 * after the page loads, still without naming a voter.
 */
export function WinnerBoard({ enabled, seed, ballots }: { enabled: boolean; seed: WinnerCard[]; ballots: BallotPeek[] }) {
  const [cards, setCards] = useState(seed);
  const [checked, setChecked] = useState(!enabled);

  useEffect(() => {
    if (!enabled || !ballots.length) return;
    let cancel = false;
    Promise.all(
      ballots.map(async (ballot) => {
        const response = await fetch(`/api/good-neighbor?month=${encodeURIComponent(ballot.month)}`);
        const data = (await response.json()) as { winner?: string | null };
        return { ballot, winner: data.winner };
      }),
    )
      .then((rows) => {
        if (cancel) return;
        const next: WinnerCard[] = [];
        for (const row of rows) {
          if (!row.winner) continue;
          const nominee = row.ballot.nominees.find((item) => item.slug === row.winner);
          if (!nominee) continue;
          next.push({
            month: row.ballot.month,
            slug: nominee.slug,
            label: row.ballot.label,
            href: row.ballot.href,
            title: nominee.title,
            dek: nominee.dek,
            place: nominee.place,
            image: nominee.image,
            imageAlt: nominee.imageAlt,
            imageTreatment: nominee.imageTreatment,
          });
        }
        next.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));
        setCards(next);
        setChecked(true);
      })
      .catch(() => {
        if (!cancel) setChecked(true);
      });
    return () => {
      cancel = true;
    };
  }, [enabled, ballots]);

  if (!cards.length) {
    if (enabled && !checked) return <p className="lede">Checking the ballots.</p>;
    return (
      <p className="lede">
        {enabled
          ? "No winner is recorded yet. A month is named after the 25th, once at least one vote is in."
          : "No winner is recorded yet. Shared totals are off, so a closed month does not name a winner. The ballot still lists the neighbors."}
      </p>
    );
  }

  return (
    <div className="week-index">
      {cards.map((card) => (
        <Link key={card.month} href={`/story/${card.slug}`} className="week-row">
          <span className="week-row-img">
            <StoryImage src={card.image} alt={card.imageAlt} sizes="(max-width: 700px) 100vw, 180px" treatment={card.imageTreatment} />
          </span>
          <span>
            <span className="kicker">{card.label}</span>
            <h2>{card.title}</h2>
            <p>
              {card.place}. {card.dek}
            </p>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function LiveBadge({ slug, month, href, label }: { slug: string; month: string; href: string; label: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let cancel = false;
    fetch(`/api/good-neighbor?month=${encodeURIComponent(month)}`)
      .then((response) => response.json())
      .then((data: { winner?: string | null }) => {
        if (!cancel && data.winner === slug) setShow(true);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [month, slug]);
  if (!show) return null;
  return (
    <Link href={href} className="gn-badge">
      {label}
    </Link>
  );
}
