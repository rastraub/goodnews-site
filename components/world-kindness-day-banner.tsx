import Link from "next/link";
import { activeHomepageBanner } from "@/lib/homepage-banner";
import { WORLD_KINDNESS_PATH } from "@/lib/world-kindness-day";

/**
 * Eligible November 6 through November 14, America/Denver, every year.
 * The homepage shows one seasonal banner. On November 11 the Veterans Day
 * banner takes the slot. A static build picks the day up on the next deploy.
 */
export function WorldKindnessDayBanner() {
  if (activeHomepageBanner() !== "world-kindness") return null;
  return (
    <section className="season-banner">
      <div className="wrap">
        <Link href={WORLD_KINDNESS_PATH}>
          <span className="label">November 13</span>
          <strong>World Kindness Day: verified stories, and 13 free ways to be kind.</strong>
          <span className="go">
            Read the hub
            <svg className="ico" aria-hidden="true">
              <use href="#i-arrow" />
            </svg>
          </span>
        </Link>
      </div>
    </section>
  );
}
