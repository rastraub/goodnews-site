import Link from "next/link";
import { GIVING_TUESDAY_PATH, isGivingTuesdaySeason } from "@/lib/giving-tuesday";
import { editionDay } from "@/lib/world-pick";

export function GivingTuesdayBanner({ today = editionDay() }: { today?: string }) {
  if (!isGivingTuesdaySeason(today)) return null;
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
