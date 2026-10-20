import Link from "next/link";
import { StoryImage } from "@/components/story-image";
import { placeLabel, toCard } from "@/lib/present";
import { getPublishedStories, type Story } from "@/lib/stories";
import { worldSpotlight } from "@/lib/world-pick";

export function WorldSpotlight({ story }: { story?: Story }) {
  const pick = story ?? worldSpotlight(getPublishedStories());
  if (!pick) return null;
  const card = toCard(pick);
  return (
    <section className="world-spot" aria-labelledby="world-spot-title">
      <div className="wrap">
        <article className="world-spot-card">
          <Link className="world-spot-img" href={`/story/${pick.slug}`}>
            <StoryImage src={pick.image} alt={pick.imageAlt} sizes="(max-width: 700px) 100vw, 280px" treatment={pick.imageTreatment} />
          </Link>
          <div>
            <p className="kicker" id="world-spot-title">Good news from around the world</p>
            <p className="place">{placeLabel(pick)}</p>
            <h2>
              <Link href={`/story/${pick.slug}`}>{card.shortTitle}</Link>
            </h2>
            <p>{pick.dek}</p>
            <Link className="more" href="/world">
              More from around the world
              <svg className="ico" aria-hidden="true"><use href="#i-arrow" /></svg>
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
