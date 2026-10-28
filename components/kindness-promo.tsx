import Link from "next/link";
import { StoryImage } from "@/components/story-image";
import { thisWeeksChallenge } from "@/lib/kindness";

export function KindnessPromo() {
  const challenge = thisWeeksChallenge();
  if (!challenge) return null;
  return (
    <div className="week-promo kindness-promo">
      <Link href={challenge.path} className="week-promo-card">
        <span className="week-promo-img">
          <StoryImage src={challenge.story.image} alt={challenge.story.imageAlt} sizes="120px" thumb treatment={challenge.story.imageTreatment} />
        </span>
        <span>
          <span className="kicker">Kindness Challenge</span>
          <h2>This week&apos;s kindness challenge</h2>
          <p>{challenge.challenge}</p>
          <span className="more">
            Try it this week
            <svg className="ico" aria-hidden="true">
              <use href="#i-arrow" />
            </svg>
          </span>
        </span>
      </Link>
    </div>
  );
}
