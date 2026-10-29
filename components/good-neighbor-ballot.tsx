"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { EmailSignup } from "@/components/email-signup";
import { ShareButtons } from "@/components/share-buttons";
import { StoryImage } from "@/components/story-image";
import { VerifiedBadge } from "@/components/verified-badge";
import { voteShareText, winnerSlug, type BallotNominee } from "@/lib/good-neighbor";
import { siteConfig } from "@/site.config";

type Props = {
  month: string;
  monthName: string;
  path: string;
  open: boolean;
  votesEnabled: boolean;
  editorWinner?: string;
  initialCounts: Record<string, number>;
  nominees: BallotNominee[];
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function choiceKey(month: string) {
  return `gn-choice:${month}`;
}

function modeKey(month: string) {
  return `gn-mode:${month}`;
}

function voterKey() {
  return "gn-voter";
}

function readLocal(key: string) {
  return window.localStorage.getItem(key);
}

export function GoodNeighborBallot({
  month,
  monthName,
  path,
  open,
  votesEnabled,
  editorWinner,
  initialCounts,
  nominees,
}: Props) {
  const choice = useSyncExternalStore(subscribe, () => readLocal(choiceKey(month)), () => null);
  const mode = useSyncExternalStore(subscribe, () => readLocal(modeKey(month)), () => null);
  const [counts, setCounts] = useState(initialCounts);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [copied, setCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const total = Object.values(counts).reduce((sum, votes) => sum + votes, 0);
  const winner = winnerSlug(
    nominees.map((nominee) => ({ slug: nominee.slug, date: nominee.date })),
    counts,
    { open, editorWinner },
  );
  const chosen = nominees.find((nominee) => nominee.slug === choice);
  const shareText = chosen ? voteShareText(siteConfig.name, chosen.shortTitle) : "";
  const ranked = !open && (votesEnabled || winner);
  const ordered = ranked
    ? nominees.slice().sort((a, b) => {
        const av = counts[a.slug] ?? 0;
        const bv = counts[b.slug] ?? 0;
        if (av !== bv) return bv - av;
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return a.slug.localeCompare(b.slug);
      })
    : nominees;
  const maxVotes = Math.max(1, ...ordered.map((nominee) => counts[nominee.slug] ?? 0));

  useEffect(() => {
    if (!votesEnabled) return;
    let cancel = false;
    fetch(`/api/good-neighbor?month=${encodeURIComponent(month)}`)
      .then((response) => response.json())
      .then((data: { counts?: Record<string, number> }) => {
        if (!cancel && data.counts) setCounts(data.counts);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [month, votesEnabled]);

  function remember(slug: string, nextMode: "vote" | "cheer") {
    window.localStorage.setItem(choiceKey(month), slug);
    window.localStorage.setItem(modeKey(month), nextMode);
    emit();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => shareRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" }), 30);
  }

  function voterId(): string {
    const existing = window.localStorage.getItem(voterKey());
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(voterKey(), id);
    return id;
  }

  async function choose(slug: string) {
    if (!open || choice || busy) return;
    setMessage("");
    if (!votesEnabled) {
      remember(slug, "cheer");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/good-neighbor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, slug, voterId: voterId(), company }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        mode?: string;
        choice?: string;
        counts?: Record<string, number>;
        error?: string;
        ignored?: boolean;
      };
      if (data.ignored) return;
      if (data.counts) setCounts(data.counts);
      if (response.status === 503 || data.mode === "cheer") {
        remember(slug, "cheer");
        setMessage("The vote box didn't answer. This cheer stays in this browser.");
        return;
      }
      if (!response.ok || !data.ok) {
        setMessage(data.error || "Something went wrong. Please try again.");
        return;
      }
      remember(data.choice || slug, "vote");
    } catch {
      remember(slug, "cheer");
      setMessage("The vote box didn't answer. This cheer stays in this browser.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLine() {
    if (!chosen) return;
    try {
      await navigator.clipboard.writeText(`${shareText}\n${siteConfig.url}${path}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const winnerCard = nominees.find((nominee) => nominee.slug === winner);

  return (
    <>
      {winner && winnerCard ? (
        <div className="gn-winner">
          <p className="kicker">{`Good Neighbor of ${monthName}`}</p>
          <h2>
            <Link href={`/story/${winnerCard.slug}`}>{winnerCard.shortTitle}</Link>
          </h2>
          <p>The badge is on the story. Who voted is not published.</p>
        </div>
      ) : null}
      {chosen ? (
        <div className="gn-share" ref={shareRef}>
          <p className="kicker">{mode === "vote" ? "Your vote" : "Your cheer"}</p>
          <h2>{mode === "vote" ? `Your vote is in for ${chosen.shortTitle}.` : `You cheered ${chosen.shortTitle}.`}</h2>
          <p className="gn-quote">{shareText}</p>
          <div className="gn-share-actions">
            <button type="button" className="btn btn-ink" onClick={copyLine}>
              {copied ? "Copied" : "Copy the line"}
            </button>
            <ShareButtons title={chosen.shortTitle} path={path} text={shareText} />
          </div>
          <p className="gn-fine">
            {mode === "vote"
              ? "One vote per browser this month. Totals are public. Who voted is not."
              : "This cheer stays in this browser. We don't store a name."}
          </p>
          <div className="gn-mail">
            <h3>Want this in the morning?</h3>
            <p>The Top 5 is a short email of verified good news. Free, and the address is never sold.</p>
            <EmailSignup variant="inline" id="good-neighbor-email" />
          </div>
        </div>
      ) : null}
      {message ? (
        <p className="error" role="alert">
          {message}
        </p>
      ) : null}
      <div className="hp" aria-hidden="true">
        <label>
          Company
          <input tabIndex={-1} autoComplete="off" value={company} onChange={(event) => setCompany(event.target.value)} />
        </label>
      </div>
      <ol className="gn-list">
        {ordered.map((nominee, index) => {
          const votes = counts[nominee.slug] ?? 0;
          const mine = choice === nominee.slug;
          const showCount = votesEnabled && total > 0;
          return (
            <li key={nominee.slug} className={nominee.slug === winner ? "gn-card is-winner" : "gn-card"}>
              <Link href={`/story/${nominee.slug}`} className="gn-photo">
                {ranked && showCount ? <span className="gn-rank">{index + 1}</span> : null}
                <StoryImage
                  src={nominee.image}
                  alt={nominee.imageAlt}
                  sizes="(max-width: 700px) 100vw, 220px"
                  treatment={nominee.imageTreatment}
                  priority={index === 0}
                />
              </Link>
              <div>
                <p className="kicker">
                  {nominee.categoryLabel}
                  <span className="dot" />
                  <span className="place">{nominee.place}</span>
                </p>
                <h3>
                  <Link href={`/story/${nominee.slug}`}>{nominee.title}</Link>
                </h3>
                <p>{nominee.dek}</p>
                {nominee.kidSummary ? (
                  <p className="gn-kid">
                    <span>Read aloud</span>
                    {nominee.kidSummary}
                  </p>
                ) : null}
                <VerifiedBadge source={nominee.sourceName} />
                {showCount ? (
                  <div className="gn-tally">
                    <div className="gn-bar" aria-hidden="true">
                      <span style={{ width: `${Math.max(8, Math.round((votes / maxVotes) * 100))}%` }} />
                    </div>
                    <p>
                      {votes.toLocaleString("en-US")} {votes === 1 ? "vote" : "votes"}
                    </p>
                  </div>
                ) : null}
                <div className="gn-actions">
                  {open ? (
                    <button
                      type="button"
                      className={mine ? "btn btn-gold" : "btn btn-ink"}
                      aria-pressed={mine}
                      disabled={busy || Boolean(choice && !mine)}
                      onClick={() => choose(nominee.slug)}
                    >
                      {mine ? (mode === "vote" ? "Your vote" : "Cheered") : votesEnabled ? "Vote" : "Cheer your favorite"}
                    </button>
                  ) : null}
                  <Link href={`/story/${nominee.slug}#how-to-help`} className="howto">
                    <svg className="ico" aria-hidden="true">
                      <use href="#i-hand" />
                    </svg>
                    How to help
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {chosen ? null : (
        <section className="gn-mail gn-mail-block">
          <h2>Want this in the morning?</h2>
          <p>The Top 5 is a short email of verified good news. Free, and the address is never sold.</p>
          <EmailSignup variant="inline" id="good-neighbor-email" />
        </section>
      )}
    </>
  );
}
