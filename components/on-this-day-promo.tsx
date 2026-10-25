import Link from "next/link";
import { ON_THIS_DAY_TODAY_PATH } from "@/lib/on-this-day";

export function OnThisDayPromo() {
  return (
    <div className="otd-promo">
      <Link href={ON_THIS_DAY_TODAY_PATH} className="otd-promo-card">
        <span>
          <span className="kicker">On this day</span>
          <h2>Good news on this day</h2>
          <p>Verified milestones for today&apos;s date in Mountain Time, plus stories from the archive.</p>
          <span className="more">
            Open today&apos;s page
            <svg className="ico" aria-hidden="true">
              <use href="#i-arrow" />
            </svg>
          </span>
        </span>
      </Link>
    </div>
  );
}
