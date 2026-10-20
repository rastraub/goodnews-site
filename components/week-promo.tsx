import Link from "next/link";
import { StoryImage } from "@/components/story-image";
import { weeksToPrerender } from "@/lib/weeks";

export function WeekPromo() {
  const weeks = weeksToPrerender();
  const week = weeks[weeks.length - 1];
  if (!week) return null;
  const count = `${week.stories.length} ${week.stories.length === 1 ? "story" : "stories"}`;
  return (
    <div className="week-promo">
      <Link href={week.path} className="week-promo-card">
        <span className="week-promo-img">
          <StoryImage src={week.image} alt={week.imageAlt} sizes="120px" thumb />
        </span>
        <span>
          <span className="kicker">{week.inProgress ? "So far" : "This week"}</span>
          <h2>This week in good news</h2>
          <p>
            {count}
            {week.inProgress ? " so far" : ""}, {week.rangeLabel}.
          </p>
          <span className="more">
            Read the week
            <svg className="ico" aria-hidden="true">
              <use href="#i-arrow" />
            </svg>
          </span>
        </span>
      </Link>
    </div>
  );
}
