import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyBlock } from "@/components/copy-block";
import { JsonLd } from "@/components/json-ld";
import { listingMeta } from "@/lib/seo";
import { formatLongDate, parseIsoDate, weekStart } from "@/lib/weeks";
import {
  WORKPLACE_PATH,
  digestsToPrerender,
  workplaceDigestJsonLd,
  type WorkplaceDigest,
} from "@/lib/workplace";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ start: string }> };

export function generateStaticParams() {
  return digestsToPrerender().map((digest) => ({ start: digest.start }));
}

function lookup(start: string): WorkplaceDigest | undefined {
  return digestsToPrerender().find((digest) => digest.start === start);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { start } = await params;
  const digest = lookup(start);
  if (!digest) return {};
  return listingMeta({
    title: digest.title,
    description: digest.description,
    base: digest.path,
    page: 1,
    total: 1,
    image: digest.image ? { url: digest.image, alt: digest.imageAlt || digest.title } : undefined,
  });
}

export default async function WorkplaceDigestPage({ params }: Props) {
  const { start } = await params;
  if (!parseIsoDate(start) || weekStart(start) !== start) notFound();
  const digests = digestsToPrerender();
  const digest = digests.find((item) => item.start === start);
  if (!digest) notFound();
  const index = digests.findIndex((item) => item.start === start);
  const previous = index > 0 ? digests[index - 1] : undefined;
  const next = index >= 0 && index < digests.length - 1 ? digests[index + 1] : undefined;

  return (
    <div className="page-block">
      <JsonLd data={workplaceDigestJsonLd(digest)} />
      <div className="wrap page-hero kit">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={WORKPLACE_PATH}>Workplace digest</Link>
          <span aria-hidden="true">/</span>
          <span>{digest.rangeLabel}</span>
        </p>
        <p className="kicker">{digest.inProgress ? "This week, so far" : "Workplace week"}</p>
        <h1>Good news for {digest.rangeLabel}.</h1>
        <p className="byline">{siteConfig.editor.name}</p>
        <p className="lede">
          {digest.stories.length} stories for a Slack or Teams post. Each line is taken from the story already on {siteConfig.name}. The sign-off gives credit here and the story page gives credit to the original newsroom.
        </p>
        {digest.inProgress ? (
          <p>This week is still open through {formatLongDate(digest.end)}. Copy it if you need a post today. The RSS feed adds the week after Sunday.</p>
        ) : null}
        <p className="announce-meta">
          {digest.plainText.length} characters. Written to land between 800 and 1,200.
        </p>
        <h2>Slack and Teams</h2>
        <CopyBlock value={digest.plainText} label="Copy Slack and Teams text" />
        <h2>Email</h2>
        <p>The same post as HTML. No images, no scripts, and no tracking pixel.</p>
        <CopyBlock value={digest.html} label="Copy email HTML" />
        <h2>Stories in this post</h2>
        <ol className="workplace-picks">
          {digest.stories.map((story, index) => (
            <li key={story.slug}>
              <span className="kicker">
                {index + 1}
                {story.pinned ? " · Pinned" : ""}
              </span>
              <Link href={`/story/${story.slug}`}>{story.title}</Link>
              <p>{story.line}</p>
            </li>
          ))}
        </ol>
        <p>
          The email-signature badge lives on the <Link href={`${WORKPLACE_PATH}#signature`}>workplace page</Link>. A library that wants a printable card can use the <Link href="/libraries">Good News Shelf</Link>.
        </p>
        <nav className="pager" aria-label="Workplace weeks">
          {previous ? <Link href={previous.path}>Previous week</Link> : <span className="muted">Previous week</span>}
          <Link href={WORKPLACE_PATH}>All workplace weeks</Link>
          {next ? <Link href={next.path}>Next week</Link> : <span className="muted">Next week</span>}
        </nav>
      </div>
    </div>
  );
}
