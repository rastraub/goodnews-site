import Link from "next/link";
import { EmailSignup } from "@/components/email-signup";
import { HomeLatest } from "@/components/home-latest";
import { JsonLd } from "@/components/json-ld";
import { LocalExplorer } from "@/components/local-explorer";
import { CheerButton } from "@/components/cheer-button";
import { EmphaticTitle } from "@/components/story-body";
import { TopFiveCard } from "@/components/story-card";
import { StoryImage } from "@/components/story-image";
import { VerifiedBadge } from "@/components/verified-badge";
import { getStateByCode, stateName } from "@/lib/states";
import { placeLabel, toCard } from "@/lib/present";
import { getHero, getPublishedStories, getTop5, stateCounts } from "@/lib/stories";
import { siteConfig } from "@/site.config";

export default function HomePage() {
  const stories = getPublishedStories();
  const hero = getHero(stories);
  const top5 = getTop5(stories);
  const cards = stories.map(toCard);
  const counts = stateCounts(stories);
  const chips = counts.slice(0, 4).map((item) => ({
    href: `/state/${getStateByCode(item.code)?.slug ?? ""}`,
    label: stateName(item.code),
    count: item.count,
  }));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteConfig.name,
          url: siteConfig.url,
          description: siteConfig.description,
          potentialAction: {
            "@type": "SearchAction",
            target: `${siteConfig.url}/search?q={query}`,
            "query-input": "required name=query",
          },
        }}
      />
      {hero ? <Hero story={hero} /> : null}
      <section className="top5">
        <div className="wrap">
          <div className="shead">
            <div>
              <h2>Today&apos;s Top 5</h2>
              <p>The five best things that happened in America, checked and ready.</p>
            </div>
            <span className="pill-time">
              <svg className="ico" aria-hidden="true">
                <use href="#i-clock" />
              </svg>
              A 2-minute read
            </span>
          </div>
          <div className="t5">
            {top5.map((story, index) => (
              <TopFiveCard key={story.slug} story={toCard(story)} n={index + 1} />
            ))}
          </div>
        </div>
      </section>
      <LocalExplorer highlighted={counts.map((item) => item.code.toLowerCase())} chips={chips} />
      <EmailSignup />
      <HomeLatest stories={cards} heroSlug={hero?.slug} />
      <section className="member">
        <div className="wrap member-in">
          <div className="mcard">
            <div className="mi" style={{ background: "#FFF1D2", color: "#C98612" }}>
              <svg className="ico" style={{ width: 22, height: 22 }} aria-hidden="true">
                <use href="#i-pen" />
              </svg>
            </div>
            <h3>Know a good story?</h3>
            <p>Tell us about a neighbor, a teacher, or a town doing something kind. We check every tip.</p>
            <Link className="more" href="/submit">
              Submit a story
              <svg className="ico" aria-hidden="true"><use href="#i-arrow" /></svg>
            </Link>
          </div>
          <div className="mcard">
            <div className="mi" style={{ background: "#E6F0FA", color: "#3E78B2" }}>
              <svg className="ico" style={{ width: 22, height: 22 }} aria-hidden="true">
                <use href="#i-hand" />
              </svg>
            </div>
            <h3>Turn a smile into action</h3>
            <p>Most stories come with a simple way to donate, volunteer, or say thank you.</p>
            <Link className="more" href="/help">
              Ways to help today
              <svg className="ico" aria-hidden="true"><use href="#i-arrow" /></svg>
            </Link>
          </div>
          <div className="mcard">
            <div className="mi" style={{ background: "#E8F5EE", color: "#2E8B66" }}>
              <svg className="ico" style={{ width: 22, height: 22 }} aria-hidden="true">
                <use href="#i-sun" />
              </svg>
            </div>
            <h3>Go ad-free for $3 a month</h3>
            <p>Members keep good news free for everyone and get a calm, ad-free site in return.</p>
            <Link className="more" href="/membership">
              Become a member
              <svg className="ico" aria-hidden="true"><use href="#i-arrow" /></svg>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Hero({ story }: { story: NonNullable<ReturnType<typeof getHero>> }) {
  const card = toCard(story);
  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <Link className="hero-img" href={`/story/${story.slug}`}>
          <span className="tag-float">
            <i />
            Story of the day
          </span>
          <StoryImage src={story.image} alt={story.imageAlt} priority sizes="(max-width: 700px) 100vw, 720px" />
        </Link>
        <div>
          <div className="kicker">
            {card.categoryLabel}
            <span className="dot" />
            <span className="place">{placeLabel(story)}</span>
          </div>
          <EmphaticTitle title={story.title} emphasis={story.emphasis} />
          <p className="dek">{story.dek}</p>
          <div className="meta">
            <VerifiedBadge source={story.sourceName} withSourceWord />
            <span className="time">
              {card.dateLabel} · {story.minutes} min read
            </span>
          </div>
          <div className="actions">
            <CheerButton slug={story.slug} count={story.cheers} variant="hero" />
            <Link className="help" href={`/story/${story.slug}#how-to-help`}>
              <svg className="ico" aria-hidden="true">
                <use href="#i-hand" />
              </svg>
              How to help
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
