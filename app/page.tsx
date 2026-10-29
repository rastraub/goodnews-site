import Link from "next/link";
import { EmailSignup } from "@/components/email-signup";
import { GivingTuesdayBanner } from "@/components/giving-tuesday-banner";
import { HomeLatest } from "@/components/home-latest";
import { LocalExplorer } from "@/components/local-explorer";
import { CheerButton } from "@/components/cheer-button";
import { EmphaticTitle } from "@/components/story-body";
import { TopFiveCard } from "@/components/story-card";
import { FirstRespondersDayBanner } from "@/components/first-responders-day-banner";
import { GoodNeighborPromo } from "@/components/good-neighbor-promo";
import { IndexPromo } from "@/components/index-promo";
import { KindnessPromo } from "@/components/kindness-promo";
import { OnThisDayPromo } from "@/components/on-this-day-promo";
import { ThanksBanner } from "@/components/thanks-banner";
import { VeteransDayBanner } from "@/components/veterans-day-banner";
import { WeekPromo } from "@/components/week-promo";
import { WorldSpotlight } from "@/components/world-spotlight";
import { StoryImage } from "@/components/story-image";
import { VerifiedBadge } from "@/components/verified-badge";
import { CATEGORIES } from "@/lib/categories";
import { getStateByCode, stateName } from "@/lib/states";
import { placeLabel, toCard, type StoryCardModel } from "@/lib/present";
import { packsToPrerender } from "@/lib/classroom-pack";
import { getHero, getPublishedStories, getTop5, stateCounts } from "@/lib/stories";
import { listWebStories } from "@/lib/web-stories";
import { siteConfig } from "@/site.config";

const SHELF_ALL = 24;
const SHELF_PER_CATEGORY = 6;

function homeShelf(cards: StoryCardModel[], heroSlug?: string): StoryCardModel[] {
  const rest = cards.filter((story) => story.slug !== heroSlug);
  const picked: StoryCardModel[] = [];
  const seen = new Set<string>();
  function add(story: StoryCardModel) {
    if (seen.has(story.slug)) return;
    seen.add(story.slug);
    picked.push(story);
  }
  for (const story of rest.slice(0, SHELF_ALL)) add(story);
  for (const category of CATEGORIES) {
    let count = 0;
    for (const story of rest) {
      if (story.category !== category.slug) continue;
      add(story);
      count += 1;
      if (count === SHELF_PER_CATEGORY) break;
    }
  }
  return picked;
}

export default function HomePage() {
  const stories = getPublishedStories();
  const hero = getHero(stories);
  const top5 = getTop5(stories);
  const friday = packsToPrerender().at(-1);
  const fridayHref = friday?.inProgress ? friday.path : "/classroom";
  const fridayLabel = friday?.inProgress ? "Print this week's Good News Friday" : "Good News Friday for class";
  const cards = stories.map(toCard);
  const counts = stateCounts(stories);
  const latestWebStory = listWebStories(stories)[0];
  const chips = counts.slice(0, 4).map((item) => ({
    href: `/state/${getStateByCode(item.code)?.slug ?? ""}`,
    label: stateName(item.code),
    count: item.count,
  }));

  return (
    <>
      <ThanksBanner />
      <GivingTuesdayBanner />
      <VeteransDayBanner />
      <FirstRespondersDayBanner />
      {hero ? (
        <Hero story={hero} fridayHref={fridayHref} fridayLabel={fridayLabel} />
      ) : (
        <div className="wrap" style={{ paddingTop: 28 }}>
          <FridayLink href={fridayHref} label={fridayLabel} />
        </div>
      )}
      <section className="top5">
        <div className="wrap">
          <div className="shead">
            <div>
              <h2>Today&apos;s Top 5</h2>
              <p>The five best things that happened in America, checked and ready.</p>
              {latestWebStory ? (
                <a className="web-story-link" href={latestWebStory.path}>
                  Today&apos;s web story
                </a>
              ) : null}
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
          <WeekPromo />
          <IndexPromo />
          <OnThisDayPromo />
          <GoodNeighborPromo />
          <KindnessPromo />
        </div>
      </section>
      <WorldSpotlight />
      <LocalExplorer highlighted={counts.map((item) => item.code.toLowerCase())} chips={chips} />
      <EmailSignup />
      <HomeLatest stories={homeShelf(cards, hero?.slug)} heroSlug={hero?.slug} />
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

function FridayLink({ href, label }: { href: string; label: string }) {
  return (
    <p className="home-pack-link">
      <Link href={href}>{label}</Link>
    </p>
  );
}

function Hero({
  story,
  fridayHref,
  fridayLabel,
}: {
  story: NonNullable<ReturnType<typeof getHero>>;
  fridayHref: string;
  fridayLabel: string;
}) {
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
            <span className="byline">
              By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
            </span>
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
          <FridayLink href={fridayHref} label={fridayLabel} />
        </div>
      </div>
    </section>
  );
}
