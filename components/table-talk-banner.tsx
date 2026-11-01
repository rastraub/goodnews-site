import Link from "next/link";
import { activeHomepageBanner } from "@/lib/homepage-banner";
import { TABLE_TALK_PATH } from "@/lib/table-talk";

/**
 * Eligible November 16 through November 27, America/Denver, every year.
 * The homepage shows one seasonal banner. Giving Tuesday keeps November 24
 * through December 2, including the days this window still overlaps.
 */
export function TableTalkBanner() {
  if (activeHomepageBanner() !== "table-talk") return null;
  return (
    <aside className="table-talk-banner" aria-label="Good News Table Talk">
      <div className="wrap">
        <Link href={TABLE_TALK_PATH}>
          <span className="kicker">Thanksgiving</span>
          <span className="thanks-banner-text">Good News Table Talk, printable cards from real stories</span>
          <span className="more">
            Print the cards
            <svg className="ico" aria-hidden="true">
              <use href="#i-arrow" />
            </svg>
          </span>
        </Link>
      </div>
    </aside>
  );
}
