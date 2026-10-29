import type { Metadata } from "next";
import Link from "next/link";
import { CopyLink } from "@/components/copy-link";
import { EmailSignup } from "@/components/email-signup";
import { GivingFilters } from "@/components/giving-filters";
import { GivingMap } from "@/components/giving-map";
import { JsonLd } from "@/components/json-ld";
import { ShareButtons } from "@/components/share-buttons";
import { StoryImage } from "@/components/story-image";
import { openGraphImage } from "@/lib/feed-image";
import {
  FREE_ACTION_LABEL,
  GIVING_TUESDAY_PATH,
  GIVING_TUESDAY_TITLE,
  getGivingGuide,
  givingDescription,
  givingOgPick,
  givingShareLine,
  type GivingPick,
} from "@/lib/giving-tuesday";
import { HELP_KIND_LABEL } from "@/lib/help";
import { listingJsonLd, pageAlternates, xHandle } from "@/lib/seo";
import { STATES, type StateInfo } from "@/lib/states";
import { siteConfig } from "@/site.config";

export function generateMetadata(): Metadata {
  const guide = getGivingGuide();
  const description = givingDescription(guide.gaps.length);
  const photo = givingOgPick(guide);
  const image = photo ? openGraphImage(photo) : undefined;
  return {
    title: GIVING_TUESDAY_TITLE,
    description,
    alternates: pageAlternates(GIVING_TUESDAY_PATH),
    ...(image
      ? {
          openGraph: {
            url: GIVING_TUESDAY_PATH,
            title: GIVING_TUESDAY_TITLE,
            description,
            images: [
              {
                url: image.url,
                alt: image.alt,
                type: image.type,
                ...(image.width && image.height ? { width: image.width, height: image.height } : {}),
              },
            ],
          },
          twitter: {
            card: "summary_large_image" as const,
            site: xHandle(),
            title: GIVING_TUESDAY_TITLE,
            description,
            images: [image.url],
          },
        }
      : {}),
  };
}

function causeTokens(pick: GivingPick): string {
  return pick.causes.length ? pick.causes.join(" ") : "other";
}

function GivingCard({ pick, role }: { pick: GivingPick; role: "featured" | "alternate" }) {
  const sameName = pick.organization === pick.helpLabel;
  return (
    <article
      id={role === "featured" ? pick.stateSlug : undefined}
      className="give-card"
      data-giving-card=""
      data-role={role}
      data-state={pick.stateCode}
      data-causes={causeTokens(pick)}
    >
      <div className="ph">
        <StoryImage
          src={pick.image}
          alt={pick.imageAlt}
          sizes="(max-width: 700px) 100vw, 480px"
          thumb={role === "alternate"}
        />
      </div>
      <p className="kicker">
        {pick.stateName}
        <span className="dot" />
        <span className="place">{pick.city}</span>
      </p>
      {pick.pinned ? <p className="give-pin">Editor pin</p> : null}
      {pick.freeAction ? <p className="give-badge">Costs nothing · {FREE_ACTION_LABEL[pick.freeAction]}</p> : null}
      <h2>
        {sameName ? (
          <a href={pick.helpUrl} target="_blank" rel="noopener noreferrer">
            {pick.organization}
          </a>
        ) : (
          pick.organization
        )}
      </h2>
      <p className="give-dek">{pick.dek}</p>
      {sameName ? (
        <p className="give-kind">{HELP_KIND_LABEL[pick.helpKind]}</p>
      ) : (
        <a className="give-link" href={pick.helpUrl} target="_blank" rel="noopener noreferrer">
          <span>{pick.helpLabel}</span>
          <small>{HELP_KIND_LABEL[pick.helpKind]}</small>
        </a>
      )}
      <p className="give-credit">
        <Link href={`/story/${pick.slug}`}>Read the story</Link>
        <span aria-hidden="true"> · </span>
        <a href={pick.sourceUrl} target="_blank" rel="noopener noreferrer">
          Reported by {pick.sourceName}
        </a>
      </p>
    </article>
  );
}

function GapCard({ state }: { state: StateInfo }) {
  return (
    <article id={state.slug} className="give-card give-gap" data-giving-gap="" data-state={state.code}>
      <p className="kicker">{state.name}</p>
      <h2>No way to help picked yet</h2>
      <p className="give-dek">No published story from {state.name} has a how-to-help link yet.</p>
      <Link className="more" href="/submit">
        Submit a story
        <svg className="ico" aria-hidden="true">
          <use href="#i-arrow" />
        </svg>
      </Link>
    </article>
  );
}

export default function GivingTuesdayPage() {
  const guide = getGivingGuide();
  const description = givingDescription(guide.gaps.length);
  const line = givingShareLine(guide.gaps.length, guide.picks.length);
  const picks = new Map(guide.picks.map((pick) => [pick.stateCode, pick]));
  const alternates = new Map<string, GivingPick[]>();
  for (const pick of guide.alternates) {
    const list = alternates.get(pick.stateCode) ?? [];
    list.push(pick);
    alternates.set(pick.stateCode, list);
  }
  return (
    <>
      <div className="page-block">
        <JsonLd
          data={listingJsonLd({
            name: GIVING_TUESDAY_TITLE,
            description,
            path: GIVING_TUESDAY_PATH,
            crumbs: [
              { name: "Today", path: "/" },
              { name: "Giving Tuesday", path: GIVING_TUESDAY_PATH },
            ],
            stories: [],
            items: guide.picks.map((pick) => ({
              name: `${pick.stateName}: ${pick.organization}`,
              path: `/story/${pick.slug}`,
            })),
            listLimit: guide.picks.length,
          })}
        />
        <div className="wrap page-hero">
          <p className="crumbs">
            <Link href="/">Today</Link>
            <span aria-hidden="true">/</span>
            <span>Giving Tuesday</span>
          </p>
          <p className="kicker">Giving Tuesday</p>
          <h1>50 states, 50 ways to help.</h1>
          <p className="lede">
            {guide.gaps.length === 0
              ? "One featured way to help for each state and Washington, D.C., drawn only from the how-to-help links on stories already published."
              : "A featured way to help for each state that already has a published how-to-help link, drawn only from those stories. States still waiting on one are marked below."}{" "}
            Giving Tuesday is the Tuesday after Thanksgiving, December 1 in 2026. This page stays up after that day.
          </p>
          <p className="byline">
            By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          </p>
          <p className="give-disclaimer">
            {siteConfig.name} is not affiliated with these organizations and does not process donations. Check each organization directly before you give time or money.
          </p>
          <div className="give-share">
            <p>{line}</p>
            <CopyLink value={`${line} ${siteConfig.url}${GIVING_TUESDAY_PATH}`} label="Copy line" />
            <ShareButtons title={line} path={GIVING_TUESDAY_PATH} />
          </div>
        </div>
        <div className="wrap">
          <GivingFilters causes={guide.causeCounts} total={guide.picks.length}>
            <nav className="give-index" aria-label="Jump to a state">
              {STATES.map((state) => {
                const open = !picks.has(state.code);
                return (
                  <a key={state.code} href={`#${state.slug}`} className={open ? "is-gap" : undefined}>
                    {state.code}
                  </a>
                );
              })}
            </nav>
            <GivingMap highlighted={[...picks.keys()].map((code) => code.toLowerCase())} gapCount={guide.gaps.length} />
            <div className="give-grid">
              {STATES.map((state) => {
                const featured = picks.get(state.code);
                if (!featured) return <GapCard key={state.code} state={state} />;
                return (
                  <div key={state.code} className="give-state" data-state={state.code}>
                    <GivingCard pick={featured} role="featured" />
                    {(alternates.get(state.code) ?? []).map((pick) => (
                      <GivingCard key={`${pick.slug}-${pick.helpUrl}`} pick={pick} role="alternate" />
                    ))}
                  </div>
                );
              })}
            </div>
          </GivingFilters>
        </div>
      </div>
      <EmailSignup id="giving-newsletter" />
    </>
  );
}
