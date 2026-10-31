import Link from "next/link";
import { activeHomepageBanner } from "@/lib/homepage-banner";
import { VETERANS_DAY_PATH } from "@/lib/veterans-day";

/**
 * Eligible November 1 through November 12 on the edition clock.
 * The homepage shows one seasonal banner. Veterans Day keeps November 11.
 * A static build picks the day up on the next deploy.
 */
export function VeteransDayBanner() {
  if (activeHomepageBanner() !== "veterans") return null;
  return (
    <section className="season-banner">
      <div className="wrap">
        <Link href={VETERANS_DAY_PATH}>
          <span className="label">Veterans Day</span>
          <strong>Kindness stories for the people who served, one from each state we can match.</strong>
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
