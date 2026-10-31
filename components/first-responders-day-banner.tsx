import Link from "next/link";
import { FIRST_RESPONDERS_DAY_PATH, firstRespondersYear } from "@/lib/first-responders-day";
import { activeHomepageBanner } from "@/lib/homepage-banner";

/**
 * Eligible October 21 through October 29, every year, on the edition clock.
 * Hidden when another seasonal banner has the single homepage slot.
 * A static build picks the day up on the next deploy.
 */
export function FirstRespondersDayBanner() {
  if (activeHomepageBanner() !== "first-responders") return null;
  const year = firstRespondersYear();
  return (
    <section className="season-banner">
      <div className="wrap">
        <Link href={FIRST_RESPONDERS_DAY_PATH}>
          <span className="label">October 28</span>
          <strong>Thank you, first responders. Stories of rescues and kindness for {year}.</strong>
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
