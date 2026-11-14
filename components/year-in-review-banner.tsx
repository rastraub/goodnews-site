import Link from "next/link";
import { yearInReviewPromo } from "@/lib/year-in-review";

/**
 * Shows beside any other seasonal banner. It does not use the single-banner
 * picker, so Giving Tuesday or a later hub can stay on the homepage too.
 */
export function YearInReviewBanner() {
  const promo = yearInReviewPromo();
  if (!promo) return null;
  return (
    <aside className="season-banner">
      <div className="wrap">
        <p>
          <b>Good News Year in Review {promo.year}.</b>{" "}
          <Link href={promo.href}>The best verified stories of the year</Link>
          , for readers and classrooms.
        </p>
      </div>
    </aside>
  );
}
