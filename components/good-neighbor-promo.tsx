import Link from "next/link";
import { StoryImage } from "@/components/story-image";
import { editionMonth } from "@/lib/good-neighbor";
import { getBallot } from "@/lib/good-neighbor-data";

export function GoodNeighborPromo() {
  const month = editionMonth();
  const ballot = getBallot(month);
  if (!ballot) return null;
  const lead = ballot.nominees[0];
  return (
    <div className="week-promo">
      <Link href="/good-neighbor" className="week-promo-card">
        {lead ? (
          <span className="week-promo-img">
            <StoryImage src={lead.image} alt={lead.imageAlt} sizes="120px" thumb treatment={lead.imageTreatment} />
          </span>
        ) : null}
        <span>
          <span className="kicker">{ballot.open ? "This month" : "Vote closed"}</span>
          <h2>Good Neighbor of {ballot.monthName}</h2>
          <p>
            {ballot.open
              ? ballot.votesEnabled
                ? `One vote through ${ballot.monthName} 25.`
                : `Cheer your favorite through ${ballot.monthName} 25.`
              : ballot.nextOpens
                ? `See ${ballot.monthName}'s neighbors. The next vote opens ${ballot.nextOpens}.`
                : `See ${ballot.monthName}'s neighbors.`}
          </p>
          <span className="more">
            {ballot.open ? "Open the ballot" : "See the neighbors"}
            <svg className="ico" aria-hidden="true">
              <use href="#i-arrow" />
            </svg>
          </span>
        </span>
      </Link>
    </div>
  );
}
