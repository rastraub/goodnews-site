import Link from "next/link";
import { PrintButton } from "@/app/(site)/kids/print-button";
import { ListenControls } from "@/components/listen-controls";
import {
  LARGE_PRINT_ABOUT_PATH,
  LARGE_PRINT_COUNT,
  LARGE_PRINT_PATH,
  largePrintDateLabel,
  largePrintPlace,
  type LargePrintEdition,
} from "@/lib/large-print";
import { largePrintListenSegments } from "@/lib/listen-text";
import { siteConfig } from "@/site.config";

const HOST = siteConfig.url.replace(/^https?:\/\//, "");

export function LargePrintSheet({
  edition,
  today,
  landing,
  editions,
}: {
  edition: LargePrintEdition;
  today: string;
  landing: boolean;
  editions: LargePrintEdition[];
}) {
  const label = largePrintDateLabel(edition.date);
  const count = edition.stories.length;
  const segments = largePrintListenSegments(
    edition.stories.map((story) => ({
      slug: story.slug,
      title: story.title,
      place: largePrintPlace(story),
      summary: story.dek,
      sourceName: story.sourceName,
    })),
  );
  const recent = landing ? editions : editions.slice(0, 14);
  const index = editions.findIndex((item) => item.date === edition.date);
  const newer = index > 0 ? editions[index - 1] : undefined;
  const older = index >= 0 && index < editions.length - 1 ? editions[index + 1] : undefined;

  return (
    <div className="wrap page-hero lp-page">
      <p className="crumbs no-print">
        <Link href="/">Today</Link>
        <span aria-hidden="true">/</span>
        {landing ? (
          <span>Large print</span>
        ) : (
          <>
            <Link href={LARGE_PRINT_PATH}>Large print</Link>
            <span aria-hidden="true">/</span>
            <span>{label}</span>
          </>
        )}
      </p>
      <article className="lp-sheet">
        <table className="lp-frame" role="presentation">
          <thead className="lp-repeat lp-repeat-head">
            <tr>
              <td>
                <p className="lp-run-head">{siteConfig.url}</p>
              </td>
            </tr>
          </thead>
          <tfoot className="lp-repeat lp-repeat-foot">
            <tr>
              <td>
                <p className="lp-run-foot">
                  {label} · {HOST}
                </p>
              </td>
            </tr>
          </tfoot>
          <tbody>
            <tr>
              <td>
        <p className="lp-mast">{siteConfig.name}</p>
        <h1>Large-print good news for seniors.</h1>
        <p className="lp-date">{label}</p>
        {landing && edition.date !== today ? (
          <p className="lp-lead">
            The latest sheet is {label}. A sheet for today appears when that morning&apos;s stories are published.
          </p>
        ) : null}
        {count > 0 ? (
          <p className="lp-lead">
            {count === 1 ? "One story" : `${count} stories`} to print or read aloud. Each one names the place and the newsroom that reported it.
            {count < LARGE_PRINT_COUNT ? " This morning has fewer than five stories that fit this sheet." : ""}
          </p>
        ) : (
          <p className="lp-lead">
            This date does not have stories ready for a large-print sheet. The sheet skips politics, violence, and stories that are not a fit to read aloud in a group.
          </p>
        )}
        {count > 0 ? (
          <div className="lp-actions no-print">
            <PrintButton label="Print this page" />
            <ListenControls className="listen-bar lp-listen no-print" label="Read aloud" groupLabel="Read this edition aloud" segments={segments} />
          </div>
        ) : null}
        {count > 0 ? (
          <ol className="lp-stories">
            {edition.stories.map((story) => {
              const place = largePrintPlace(story);
              return (
                <li key={story.slug}>
                  <article aria-labelledby={`lp-${story.slug}-title`}>
                    <h2 id={`lp-${story.slug}-title`}>
                      <Link href={`/story/${story.slug}`}>{story.title}</Link>
                    </h2>
                    <p className="lp-place" id={`lp-${story.slug}-place`}>
                      {place}
                    </p>
                    <p className="lp-summary" id={`lp-${story.slug}-summary`}>
                      {story.dek}
                    </p>
                    <p className="lp-source" id={`lp-${story.slug}-source`}>
                      Source:{" "}
                      <a href={story.sourceUrl}>{story.sourceName}</a>
                    </p>
                  </article>
                </li>
              );
            })}
          </ol>
        ) : null}
        <p className="lp-colophon">
          Free to print and share. {siteConfig.url}
        </p>
              </td>
            </tr>
          </tbody>
        </table>
      </article>
      <aside className="lp-panel no-print" aria-labelledby="lp-about-title">
        <h2 id="lp-about-title">For activity directors and librarians</h2>
        <p>This sheet is free to print and share. Hand it out, post it, or read it aloud. There is no fee and no account.</p>
        <p>A new edition is published each morning, on the same schedule as the daily edition. Each sheet lists up to five stories from that day.</p>
        <p>
          The <Link href="/subscribe">daily email</Link> carries the morning Top 5. To send a story tip, use the <Link href="/submit">submission form</Link> or write{" "}
          <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
        </p>
        <p>
          <Link href={LARGE_PRINT_ABOUT_PATH}>How to use the large-print edition</Link>
        </p>
      </aside>
      {recent.length ? (
        <nav className="lp-dates no-print" aria-label="Recent editions">
          <h2>Recent editions</h2>
          <ul>
            {recent.map((item) => (
              <li key={item.date}>
                <Link href={item.path} aria-current={!landing && item.date === edition.date ? "page" : undefined}>
                  <span>{largePrintDateLabel(item.date)}</span>
                  <span>{item.indexable ? `${item.stories.length} stories` : "Short edition"}</span>
                </Link>
              </li>
            ))}
          </ul>
          {landing ? null : (
            <p>
              <Link href={LARGE_PRINT_PATH}>All editions</Link>
            </p>
          )}
          {!landing ? (
            <p className="lp-pager">
              {newer ? <Link href={newer.path}>Newer day</Link> : <span>Newer day</span>}
              {older ? <Link href={older.path}>Older day</Link> : <span>Older day</span>}
            </p>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
