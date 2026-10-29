import Link from "next/link";
import { VETERANS_DAY_PATH, veteransDayInSeason } from "@/lib/veterans-day";

/**
 * Shown from November 1 through November 12.
 * The date is the edition clock, so a static build picks it up on the next deploy.
 */
export function VeteransDayBanner() {
  if (!veteransDayInSeason()) return null;
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
