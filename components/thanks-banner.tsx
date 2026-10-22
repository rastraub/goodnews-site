import Link from "next/link";
import { THANKS_PATH, thanksBannerVisible, thanksBoard } from "@/lib/thanks";

export function ThanksBanner() {
  if (!thanksBannerVisible()) return null;
  const board = thanksBoard();
  return (
    <aside className="thanks-banner" aria-label="Thanksgiving">
      <div className="wrap">
        <Link href={THANKS_PATH}>
          <span className="kicker">Thanksgiving</span>
          <span className="thanks-banner-text">50 States of Thanks, a gratitude story from every state</span>
          <span className="thanks-banner-count">
            {board.filled} of {board.total} filled
          </span>
          <span className="more">
            See the states
            <svg className="ico" aria-hidden="true">
              <use href="#i-arrow" />
            </svg>
          </span>
        </Link>
      </div>
    </aside>
  );
}
