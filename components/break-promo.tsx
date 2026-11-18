import Link from "next/link";
import { BINGO_PATH, BREAK_INDEX_PATH } from "@/lib/break-pack";

/** A small card for the kids page and the kindness challenge. Not a homepage banner. */
export function BreakPromo() {
  return (
    <aside className="classroom-box break-promo">
      <p className="kicker">For families</p>
      <h2>Good News Holiday Break Pack</h2>
      <p>
        Printable stories, Kindness Bingo, and screen-light activities for Thanksgiving week and winter break. Do them together at home.
      </p>
      <p className="link-pills">
        <Link href={BREAK_INDEX_PATH}>Open the pack</Link>
        <Link href={BINGO_PATH}>Kindness Bingo</Link>
      </p>
    </aside>
  );
}
