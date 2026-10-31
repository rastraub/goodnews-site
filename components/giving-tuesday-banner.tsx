import Link from "next/link";
import { GIVING_TUESDAY_PATH } from "@/lib/giving-tuesday";
import { activeHomepageBanner } from "@/lib/homepage-banner";

export function GivingTuesdayBanner() {
  if (activeHomepageBanner() !== "giving-tuesday") return null;
  return (
    <aside className="season-banner">
      <div className="wrap">
        <p>
          <b>Giving Tuesday is December 1.</b>{" "}
          <Link href={GIVING_TUESDAY_PATH}>50 states, 50 ways to help</Link>
          , taken from stories already reported.
        </p>
      </div>
    </aside>
  );
}
