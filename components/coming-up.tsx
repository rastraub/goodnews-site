import Link from "next/link";
import { CALENDAR_PATH } from "@/lib/calendar-path";
import { CALENDAR_PREVIEW_COUNT, formatObservanceShort, getCalendarView } from "@/lib/good-news-calendar";

/** A one-row preview. It belongs under the Story of the Day, not above it. */
export function ComingUp() {
  const view = getCalendarView();
  const items = view.upcoming.slice(0, CALENDAR_PREVIEW_COUNT);
  if (!items.length) return null;

  return (
    <div className="coming-up">
      <div className="coming-up-bar">
        <span className="kicker">Coming up</span>
        <ol>
          {items.map((item) => (
            <li key={item.observance.slug}>
              <Link href={item.path}>
                <time dateTime={item.start}>{formatObservanceShort(item.start, item.end, view.today)}</time>
                {item.observance.name}
              </Link>
            </li>
          ))}
        </ol>
        <Link className="more" href={CALENDAR_PATH}>
          Full calendar
          <svg className="ico" aria-hidden="true">
            <use href="#i-arrow" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
