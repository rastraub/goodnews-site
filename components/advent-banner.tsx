import Link from "next/link";
import { ADVENT_PATH, adventBannerOnDay, adventDayPath, adventIso, adventToday } from "@/lib/advent";

/**
 * A slim line from November 30 through December 24, America/Denver.
 * It is not part of the single homepage banner, so Giving Tuesday can
 * stay up on December 1 and 2 while this line sits underneath.
 * A static build picks the day up on the next deploy, same as the other banners.
 */
export function AdventBanner() {
  const today = adventToday();
  if (!adventBannerOnDay(today)) return null;
  const during = today >= adventIso(1) && today <= adventIso(24);
  const day = during ? Number(today.slice(8, 10)) : 0;
  return (
    <aside className="advent-banner" aria-label="December Advent of Good News">
      <div className="wrap">
        <p>
          <Link href={ADVENT_PATH}>December Advent of Good News</Link>
          {during ? (
            <>
              {" · "}
              <Link href={adventDayPath(day)}>Door {day} is open</Link>
              {". One real story and a free kind act, through December 24."}
            </>
          ) : (
            ". Starts December 1. One real story and a free kind act each day, for families and classrooms."
          )}
        </p>
      </div>
    </aside>
  );
}
