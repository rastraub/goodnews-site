import Link from "next/link";
import { CheerButton } from "./cheer-button";
import { StoryImage } from "./story-image";
import { VerifiedBadge } from "./verified-badge";
import type { StoryCardModel } from "@/lib/present";

export function StoryCard({ story }: { story: StoryCardModel }) {
  const href = `/story/${story.slug}`;
  return (
    <article className="card">
      <Link href={href} className="ph">
        <StoryImage
          src={story.image}
          alt={story.imageAlt}
          sizes="(max-width: 700px) 100vw, 25vw"
          treatment={story.imageTreatment}
        />
        <span className="cat" style={{ color: story.categoryColor }}>
          {story.categoryLabel}
        </span>
      </Link>
      <div className="body">
        <div className="place">{story.place}</div>
        <h3>
          <Link href={href}>{story.title}</Link>
        </h3>
        <p>{story.dek}</p>
        <VerifiedBadge source={story.sourceName} />
      </div>
      <div className="foot">
        <CheerButton slug={story.slug} count={story.cheers} />
        <Link href={`${href}#how-to-help`} className="howto">
          <svg className="ico" aria-hidden="true">
            <use href="#i-hand" />
          </svg>
          How to help
        </Link>
      </div>
    </article>
  );
}

export function TopFiveCard({ story, n }: { story: StoryCardModel; n: number }) {
  return (
    <Link href={`/story/${story.slug}`}>
      <div className="thumb">
        <StoryImage src={story.image} alt="" sizes="92px" thumb treatment={story.imageTreatment} />
        <span className="n">{n}</span>
      </div>
      <div className="txt">
        <h3>{story.shortTitle}</h3>
        <span className="src">
          <svg className="ico" aria-hidden="true">
            <use href="#i-check" />
          </svg>
          {story.sourceName}
        </span>
      </div>
    </Link>
  );
}
