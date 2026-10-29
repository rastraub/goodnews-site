import type { Metadata } from "next";
import Link from "next/link";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { TopFiveCard } from "@/components/story-card";
import { StoryImage } from "@/components/story-image";
import { VerifiedBadge } from "@/components/verified-badge";
import { emphatic } from "@/lib/format";
import { openGraphImage } from "@/lib/feed-image";
import {
  NEWS_BREAK_DESCRIPTION,
  NEWS_BREAK_TITLE,
  newsBreakHubs,
  newsBreakQuickRead,
  newsBreakTop,
  quickReadLine,
} from "@/lib/news-break";
import { placeLabel, toCard } from "@/lib/present";
import { newsBreakJsonLd, pageAlternates, xHandle } from "@/lib/seo";
import { getPublishedStories } from "@/lib/stories";
import { newsBreakBanner, siteConfig } from "@/site.config";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  const lead = newsBreakTop(getPublishedStories())[0];
  const image = lead ? openGraphImage(lead) : undefined;
  return {
    title: NEWS_BREAK_TITLE,
    description: NEWS_BREAK_DESCRIPTION,
    alternates: pageAlternates(newsBreakBanner.path),
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    openGraph: {
      type: "website",
      url: newsBreakBanner.path,
      title: NEWS_BREAK_TITLE,
      description: NEWS_BREAK_DESCRIPTION,
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      site: xHandle(),
      title: NEWS_BREAK_TITLE,
      description: NEWS_BREAK_DESCRIPTION,
      ...(image ? { images: [image.url] } : {}),
    },
  };
}

export default function NewsBreakPage() {
  const stories = getPublishedStories();
  const top = newsBreakTop(stories);
  const [lead, ...rest] = top;
  const quick = newsBreakQuickRead(
    stories,
    top.map((story) => story.slug),
  );
  const hubs = newsBreakHubs();
  const leadCard = lead ? toCard(lead) : undefined;
  const leadTitle = lead ? emphatic(lead.title, lead.emphasis) : undefined;

  return (
    <>
      <JsonLd
        data={newsBreakJsonLd({
          name: NEWS_BREAK_TITLE,
          description: NEWS_BREAK_DESCRIPTION,
          path: newsBreakBanner.path,
          stories: [...top, ...quick],
          image: lead?.image,
        })}
      />
      <div className="break-intro">
        <div className="wrap page-hero">
          <p className="crumbs">
            <Link href="/">Today</Link>
            <span aria-hidden="true">/</span>
            <span>A news break</span>
          </p>
          <p className="kicker">A quieter page</p>
          <h1>Take a break from the news.</h1>
          <p className="lede">
            Some days the headlines ask for more than you have. This page is the other shelf: a few true stories you can finish without bracing for the next one.
          </p>
          <p className="lede">
            It is here on ordinary mornings, and on the days when the news feels heavy. Stay for five stories, or for a minute.
          </p>
          <p className="jump-links">
            <a href="#todays-five">Today&apos;s five</a>
            <a href="#sixty-seconds">60-second scan</a>
            <a href="#keep-going">Keep going</a>
            <a href="#how-we-pick">How we pick stories</a>
            <a href="#daily-email">Morning email</a>
          </p>
        </div>
      </div>

      <section className="top5" id="todays-five" aria-labelledby="todays-five-title">
        <div className="wrap">
          <div className="shead">
            <div>
              <h2 id="todays-five-title">Today&apos;s five</h2>
              <p>The story of the day comes first. Each summary is checked against the original report, and that report is linked on the story.</p>
            </div>
            <span className="pill-time">
              <svg className="ico" aria-hidden="true">
                <use href="#i-clock" />
              </svg>
              A few quiet minutes
            </span>
          </div>
          {lead && leadCard && leadTitle ? (
            <article className="break-lead">
              <Link className="break-lead-img" href={`/story/${lead.slug}`}>
                <span className="tag-float">
                  <i />
                  Story of the day
                </span>
                <StoryImage
                  src={lead.image}
                  alt={lead.imageAlt}
                  sizes="(max-width: 700px) 100vw, 640px"
                  treatment={lead.imageTreatment}
                  priority
                />
              </Link>
              <div>
                <p className="kicker">
                  {leadCard.categoryLabel}
                  <span className="dot" />
                  <span className="place">{placeLabel(lead)}</span>
                </p>
                <h3>
                  <Link href={`/story/${lead.slug}`}>
                    {leadTitle.before}
                    {leadTitle.em ? <em>{leadTitle.em}</em> : null}
                    {leadTitle.after}
                  </Link>
                </h3>
                <p>{lead.dek}</p>
                <div className="meta">
                  <VerifiedBadge source={lead.sourceName} withSourceWord />
                  <span className="time">
                    {leadCard.dateLabel} · {lead.minutes} min read
                  </span>
                </div>
                <Link className="more" href={`/story/${lead.slug}#how-to-help`}>
                  How to help
                  <svg className="ico" aria-hidden="true">
                    <use href="#i-arrow" />
                  </svg>
                </Link>
              </div>
            </article>
          ) : (
            <div className="empty">
              <p className="side-title">Today&apos;s five are still being checked.</p>
              <p>The weekly roundup and the state pages are ready in the meantime.</p>
            </div>
          )}
          {rest.length ? (
            <div className="t5 t5-rest">
              {rest.map((story, index) => (
                <TopFiveCard key={story.slug} story={toCard(story)} n={index + 2} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="break-section" id="sixty-seconds" aria-labelledby="sixty-seconds-title">
        <div className="wrap">
          <div className="shead">
            <div>
              <h2 id="sixty-seconds-title">Good news in 60 seconds</h2>
              <p>A short list if a minute is all you have. Open any line for the source and a way to help.</p>
            </div>
            <span className="pill-time">
              <svg className="ico" aria-hidden="true">
                <use href="#i-clock" />
              </svg>
              About a minute
            </span>
          </div>
          {quick.length ? (
            <ol className="quick-read">
              {quick.map((story, index) => {
                const card = toCard(story);
                return (
                  <li key={story.slug}>
                    <Link href={`/story/${story.slug}`}>
                      <span className="n">{index + 1}</span>
                      <span>
                        <span className="place">{card.place}</span>
                        <h3>{card.shortTitle}</h3>
                        <p>{quickReadLine(story.dek)}</p>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="empty-note">The short list will fill in with the next edition.</p>
          )}
        </div>
      </section>

      <section className="break-section" id="keep-going" aria-labelledby="keep-going-title">
        <div className="wrap">
          <h2 id="keep-going-title">If you want to keep going</h2>
          <p className="intro">A few doors into the rest of the site. Same rules, different shelves.</p>
          <div className="break-hubs">
            {hubs.map((hub) => (
              <article className="mcard" key={hub.href}>
                <h3>{hub.title}</h3>
                <p>{hub.text}</p>
                <Link className="more" href={hub.href}>
                  {hub.cta}
                  <svg className="ico" aria-hidden="true">
                    <use href="#i-arrow" />
                  </svg>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="break-section" id="how-we-pick" aria-labelledby="how-we-pick-title">
        <div className="wrap prose-page">
          <p className="kicker">The rules</p>
          <h2 id="how-we-pick-title">How {siteConfig.name} picks stories</h2>
          <p>
            A short version of the rules on the <Link href="/about">about page</Link> and the{" "}
            <Link href="/editorial-standards">editorial standards</Link>. The morning edition uses the same ones.
          </p>
          <div className="steps">
            <div className="step">
              <div className="n">1</div>
              <div>
                <h3>Verified</h3>
                <p>{siteConfig.verification}</p>
              </div>
            </div>
            <div className="step">
              <div className="n">2</div>
              <div>
                <h3>Positive</h3>
                <p>
                  We look for true, hopeful stories: neighbors, rescuers, animals, classrooms, and scientific or medical advances that are already helping people or have been shown in human trials. The screen is the same one used before publication. Is it uplifting? Is it free of politics? Would the original newsroom recognize the headline?
                </p>
              </div>
            </div>
            <div className="step">
              <div className="n">3</div>
              <div>
                <h3>Sourced</h3>
                <p>
                  Every published story names the original newsroom and links to the report. Names, places, numbers, and quotations in our summary have to appear in that report. We do not invent quotes or fill gaps from memory.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="n">4</div>
              <div>
                <h3>A way to help</h3>
                <p>
                  Most stories come with a simple way to donate, volunteer, or say thank you. Help links go to the organization named in the reporting, not to us. The full list for the current edition is on <Link href="/help">ways to help</Link>.
                </p>
              </div>
            </div>
          </div>
          <div className="promise-card">
            <h2>What stays in</h2>
            <p>Kindness, science, neighbors, animals, health advances already helping people, and local comebacks are in.</p>
            <p>
              <strong>No candidates, parties, or culture-war topics.</strong> If a story&apos;s goodness depends on a political side, it does not belong here.
            </p>
            <p>
              The plain-language version lives on the <Link href="/about#no-politics">about page</Link>. The full rules are on{" "}
              <Link href="/editorial-standards">editorial standards</Link>.
            </p>
          </div>
        </div>
      </section>

      <EmailSignup id="daily-email" />
    </>
  );
}
